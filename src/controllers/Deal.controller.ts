import { Request, Response } from "express";
import Deal from "../models/Deal.model";
import cloudinary from "../utils/cloudinary";
import mongoose from "mongoose";
import { io } from "../server";
import { notifyNewDeal } from "../socket/socket";
import Category from "../models/Category.model";
import Booking from "../models/Booking.model";
import { PaymentInfo } from "../models/PaymentInfo.model";
import Notification from "../models/Notification.model";
import sharp from "sharp";
import asyncHandler from "../utils/asyncHandler";
import { sendMail } from "../utils/mail.helper";
import Review from "../models/Review.model";

// Types
export type MetaPagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

export type ScheduleDate = {
  date: Date;
  active: boolean;
  participationsLimit?: number;
  time?: string;
  bookedCount?: number;
};

/*********************
 * CREATE A NEW DEAL *
 *********************/
/*********************
 * CREATE A NEW DEAL *
 *********************/
export const createDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  // ── small helpers (kept local to this file) ────────────────────────────────
  const collapseWhitespace = (s: unknown) =>
    String(s ?? "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();

  const titleCase = (s: string) =>
    s.replace(/\p{L}[\p{L}\p{M}'-]*/gu, (word) =>
      word
        .split("-")
        .map(
          (part) =>
            part.charAt(0).toLocaleUpperCase() +
            part.slice(1).toLocaleLowerCase()
        )
        .join("-")
    );

  const sanitizePlace = (raw: unknown) => titleCase(collapseWhitespace(raw));
  // ──────────────────────────────────────────────────────────────────────────

  try {
    const {
      title,
      shortDescription, // 👈 add this
      description,
      price,
      offers,
      category,
      time,
      participationsLimit,
      scheduleDates,
    } = req.body;

    // (Optional) normalize/trim shortDescription
    const normalizedShort =
      (typeof shortDescription === "string" ? shortDescription.trim() : "") ||
      ""; // or derive from description if you prefer

    // Validate required fields
    if (!category) {
      res.status(400).json({ success: false, message: "Category is required" });
      return;
    }
    if (!title) {
      res.status(400).json({ success: false, message: "Title is required" });
      return;
    }
    if (!description) {
      res
        .status(400)
        .json({ success: false, message: "Description is required" });
      return;
    }
    if (!price && price !== 0) {
      res.status(400).json({ success: false, message: "Price is required" });
      return;
    }

    // If the schema has shortDescription: { required: true }, enforce it here:
    if (!normalizedShort) {
      res
        .status(400)
        .json({ success: false, message: "shortDescription is required" });
      return;
    }

    // Parse location (string or object) and SANITIZE country/city
    let country = "";
    let city = "";
    try {
      const parsedLocation =
        typeof req.body.location === "string"
          ? JSON.parse(req.body.location)
          : req.body.location;

      country = sanitizePlace(parsedLocation?.country);
      city = sanitizePlace(parsedLocation?.city);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: "Invalid location format. Expected JSON string or object.",
      });
      return;
    }

    // Validate after sanitization
    if (!country || !city) {
      res.status(400).json({
        success: false,
        message: "Country and city are required",
      });
      return;
    }

    // Parse and validate schedule dates
    let parsedScheduleDates: ScheduleDate[] = [];
    try {
      const raw =
        typeof scheduleDates === "string"
          ? JSON.parse(scheduleDates)
          : scheduleDates;

      parsedScheduleDates = (raw ?? [])
        .map((dateInfo: any) => {
          const date = new Date(dateInfo?.date);
          if (isNaN(date.getTime())) throw new Error("Invalid date format");
          return {
            date,
            active: true,
            participationsLimit:
              dateInfo?.participationsLimit ?? participationsLimit ?? 0,
            time: dateInfo?.time ?? time ?? null,
            bookedCount: 0,
          };
        })
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    } catch (e) {
      res.status(400).json({
        success: false,
        message: "Invalid scheduleDates format",
        error: (e as Error).message,
      });
      return;
    }

    // Handle image uploads (unchanged) ...
    let images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = (req.files as Express.Multer.File[]).map(
        async (file) => {
          const compressedBuffer = await sharp(file.buffer)
            .jpeg({ quality: 80 })
            .toBuffer();
          return new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: "image" },
              (error, result) =>
                error ? reject(error) : resolve(result?.secure_url || "")
            );
            stream.end(compressedBuffer);
          });
        }
      );
      images = await Promise.all(uploadPromises);
    }

    const location = { country, city }; // ← sanitized & stable

    // Create the deal
    const deal = new Deal({
      title,
      shortDescription: normalizedShort, // 👈 persist it
      description,
      price,
      location,
      images,
      offers:
        typeof offers === "string"
          ? JSON.parse(offers)
          : Array.isArray(offers)
          ? offers
          : [],
      status: parsedScheduleDates.length > 0 ? "activate" : "deactivate",
      category: new mongoose.Types.ObjectId(category),
      time,
      participationsLimit,
      scheduleDates: parsedScheduleDates,
    });

    await deal.save();

    const populatedDeal = await Deal.findById(deal._id).populate("category");
    await notifyNewDeal(io, populatedDeal);

    res.status(201).json({ success: true, deal: populatedDeal });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create deal",
      error: error.message,
    });
  }
};

/*******************
 * GET SINGLE DEAL *
 *******************/
export const getSingleDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const deal = await Deal.findOne({
      _id: id,
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
      ],
    }).populate("category");

    if (!deal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    const [bookingCounts, reviewStats, totalCheckIns] = await Promise.all([
      Promise.all(
        deal.scheduleDates.map(async (scheduleDate: any) => {
          const count = await Booking.countDocuments({
            dealsId: deal._id,
            scheduleDate: scheduleDate.date,
            isBooked: true,
          });
          return {
            date: scheduleDate.date ? scheduleDate.date : scheduleDate,
            count,
            spotsLeft: scheduleDate.participationsLimit
              ? scheduleDate.participationsLimit - count
              : null,
          };
        })
      ),
      Review.aggregate([
        { $match: { dealID: deal._id } },
        {
          $group: {
            _id: "$dealID",
            rating: { $avg: "$ratings" },
            reviewCount: { $sum: 1 },
          },
        },
      ]),
      Booking.countDocuments({
        dealsId: deal._id,
        isBooked: true,
        paymentStatus: "complete",
      }),
    ]);

    res.status(200).json({
      success: true,
      deal: {
        ...deal.toObject(),
        bookingCounts,
        rating: reviewStats[0]?.rating || 0,
        reviewCount: reviewStats[0]?.reviewCount || 0,
        totalCheckIns,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch deal",
      error: error.message,
    });
  }
};

/**************************************************
 * // GET ALL DEALS WITH FILTERING AND PAGINATION *
 **************************************************/
export const getAllDeals = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      categoryName,
      minPrice,
      maxPrice,
      country,
      city,
      location,
      title,
      page = "1",
      limit = "10",
      status,
      showAll = "false",
      latitude,
      longitude,
      radiusKm = "25",
    } = req.query as {
      categoryName?: string;
      minPrice?: string;
      maxPrice?: string;
      country?: string;
      city?: string;
      location?: string;
      title?: string;
      page?: string;
      limit?: string;
      status?: string;
      showAll?: string;
      latitude?: string;
      longitude?: string;
      radiusKm?: string;
    };

    const pageNumber = parseInt(page, 10);
    const itemsPerPage = parseInt(limit, 10);
    const skip = (pageNumber - 1) * itemsPerPage;

    const filter: any = {};

    // Public restaurant discovery never exposes pending/rejected or disabled
    // restaurants. Management uses the protected /manage/deals endpoints.
    filter.status = "activate";
    filter.$or = [
      { approvalStatus: "approved" },
      { approvalStatus: { $exists: false } },
    ];

    // Filter by title
    if (title && title.length >= 2) {
      filter.title = { $regex: title, $options: "i" };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Filter by location
    if (country || city) {
      if (country)
        filter["location.country"] = { $regex: country, $options: "i" };
      if (city) filter["location.city"] = { $regex: city, $options: "i" };
    }

    // Filter by category name
    if (categoryName) {
      const matchingCategories = await Category.find({
        categoryName: { $regex: categoryName, $options: "i" },
      });

      filter.category = { $in: matchingCategories.map((c) => c._id) };
    }

    console.log(filter);

    const parsedLatitude = latitude === undefined ? undefined : Number(latitude);
    const parsedLongitude = longitude === undefined ? undefined : Number(longitude);
    const parsedRadius = Math.max(Number(radiusKm) || 25, 0.1);
    const useDistance =
      Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
    let totalItems: number;
    let deals: any[];

    if (useDistance) {
      const allDeals = await Deal.find(filter).populate("category").sort({ createdAt: -1 });
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const withDistance = allDeals
        .map((deal: any) => {
          const lat = deal.location?.latitude;
          const lng = deal.location?.longitude;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const dLat = toRadians(lat - (parsedLatitude as number));
          const dLng = toRadians(lng - (parsedLongitude as number));
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(parsedLatitude as number)) *
              Math.cos(toRadians(lat)) *
              Math.sin(dLng / 2) ** 2;
          const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return distanceKm <= parsedRadius ? { deal, distanceKm } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm);
      totalItems = withDistance.length;
      deals = withDistance
        .slice(skip, skip + itemsPerPage)
        .map((item: any) => {
          item.deal.set("distanceKm", item.distanceKm, { strict: false });
          return item.deal;
        });
    } else {
      totalItems = await Deal.countDocuments(filter);
      deals = await Deal.find(filter)
        .populate("category")
        .skip(skip)
        .limit(itemsPerPage)
        .sort({ createdAt: -1 });
    }
    if (location) {
      filter.$and = [
        {
          $or: [
            { "location.city": { $regex: location, $options: "i" } },
            { "location.country": { $regex: location, $options: "i" } },
            { "location.address": { $regex: location, $options: "i" } },
          ],
        },
      ];
    }

    // Enrich deals with booking information
    const enrichedDeals = await Promise.all(
      deals.map(async (deal) => {
        let availableDates: any[] = [];

        if (deal.status === "activate" && Array.isArray(deal.scheduleDates)) {
          // Get all bookings for this deal to minimize database queries
          const bookings = await Booking.find({
            dealId: deal._id,
            status: "confirmed", // assuming you have a status field
          });

          availableDates = deal.scheduleDates
            .filter(
              (s: any) =>
                s &&
                typeof s === "object" &&
                s.active &&
                s.date &&
                new Date(s.date) >= new Date()
            )
            .map((schedule: any) => {
              // Calculate total booked quantity for this schedule date
              const totalBooked = bookings
                .filter(
                  (b) =>
                    b.scheduleDate &&
                    b.scheduleDate.toString() === schedule.date.toString()
                )
                .reduce((sum, booking) => sum + (booking.quantity || 0), 0);

              const spotsLeft = schedule.participationsLimit
                ? schedule.participationsLimit - totalBooked
                : null;

              return {
                date: schedule.date,
                time: schedule.time,
                spotsLeft,
                bookedCount: totalBooked, // Update the bookedCount
              };
            });
        }

        return {
          ...deal.toObject(),
          availableDates,
        };
      })
    );

    const dealIds = deals.map((deal) => deal._id);
    const reviewStats = await Review.aggregate([
      { $match: { dealID: { $in: dealIds } } },
      {
        $group: {
          _id: "$dealID",
          rating: { $avg: "$ratings" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);
    const reviewStatsByDeal = new Map(
      reviewStats.map((item) => [item._id.toString(), item])
    );
    const dealsWithReviewStats = enrichedDeals.map((deal: any) => {
      const stats = reviewStatsByDeal.get(deal._id.toString());
      return {
        ...deal,
        rating: stats?.rating || 0,
        reviewCount: stats?.reviewCount || 0,
      };
    });

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const pagination: MetaPagination = {
      currentPage: pageNumber,
      totalPages,
      totalItems,
      itemsPerPage,
    };

    res.status(200).json({
      success: true,
      deals: dealsWithReviewStats,
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch deals",
      error: error.message,
    });
  }
};

// Delete a deal
export const deleteDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const deal = await Deal.findByIdAndDelete(id);
    if (!deal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }
    res
      .status(200)
      .json({ success: true, message: "Deal deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete deal",
      error: error.message,
    });
  }
};

export const bulkDeleteDeals = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids)] : [];
    if (
      ids.length === 0 ||
      ids.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))
    ) {
      res.status(400).json({
        success: false,
        message: "Eine gültige Liste von Restaurant-IDs ist erforderlich",
      });
      return;
    }

    const result = await Deal.deleteMany({ _id: { $in: ids } });
    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} Restaurants wurden gelöscht`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Restaurants konnten nicht gelöscht werden",
      error: error.message,
    });
  }
};

/*****************
 * UPDATE A DEAL *
 *****************/

export const updateDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  // ── small helpers ─────────────────────────────────────────────────────────
  const safeParseJSON = <T = any>(v: unknown): T => {
    if (typeof v !== "string") return v as T;
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as T;
    }
  };

  const collapseWhitespace = (s: unknown) =>
    String(s ?? "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();

  const titleCase = (s: string) =>
    s.replace(/\p{L}[\p{L}\p{M}'-]*/gu, (word) =>
      word
        .split("-")
        .map(
          (part) =>
            part.charAt(0).toLocaleUpperCase() +
            part.slice(1).toLocaleLowerCase()
        )
        .join("-")
    );

  const sanitizePlace = (raw: unknown) => titleCase(collapseWhitespace(raw));

  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

  const uniq = <T>(arr: T[]) => Array.from(new Set(arr));
  // ──────────────────────────────────────────────────────────────────────────

  try {
    const { id } = req.params;

    const updateData: any = { ...req.body };

    // Parse arrays that may arrive as JSON strings
    let imagesToRemove: string[] = [];
    if (typeof updateData.imagesToRemove === "string") {
      imagesToRemove = safeParseJSON<string[]>(updateData.imagesToRemove) || [];
    } else if (Array.isArray(updateData.imagesToRemove)) {
      imagesToRemove = updateData.imagesToRemove;
    }

    // Get existing deal
    const existingDeal = await Deal.findById(id);
    if (!existingDeal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    // ---- Images handling ----------------------------------------------------
    let finalImages = Array.isArray(existingDeal.images)
      ? existingDeal.images
      : [];
    if (imagesToRemove.length) {
      finalImages = finalImages.filter((img) => !imagesToRemove.includes(img));
    }

    let newImages: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = (req.files as Express.Multer.File[]).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: "image" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result?.secure_url || "");
              }
            );
            stream.end(file.buffer);
          })
      );
      newImages = await Promise.all(uploadPromises);
    }
    finalImages = uniq([...finalImages, ...newImages]);

    // ---- Schedule Dates Handling -------------------------------------------

    // 1) removals
    if (updateData.scheduleDatesToRemove) {
      const scheduleDatesToRemove = safeParseJSON<string[]>(
        updateData.scheduleDatesToRemove
      );
      if (
        Array.isArray(scheduleDatesToRemove) &&
        scheduleDatesToRemove.length
      ) {
        existingDeal.scheduleDates = (existingDeal.scheduleDates || []).filter(
          (sd: any) => !scheduleDatesToRemove.includes(String(sd._id))
        );
      }
    }

    // 2) additions/updates (merge)
    if (updateData.scheduleDates) {
      const newScheduleDates =
        safeParseJSON<any[]>(updateData.scheduleDates) || [];

      const formattedNewDates = newScheduleDates.map((dateInfo: any) => {
        const date = new Date(dateInfo?.date);
        if (!isValidDate(date)) {
          throw new Error("Invalid date format in scheduleDates");
        }
        return {
          date,
          active: dateInfo?.active !== false,
          participationsLimit: dateInfo?.participationsLimit ?? 0,
          time: dateInfo?.time ?? null,
          bookedCount: dateInfo?.bookedCount ?? 0,
          _id: dateInfo?._id
            ? new mongoose.Types.ObjectId(dateInfo._id)
            : new mongoose.Types.ObjectId(),
        };
      });

      // Remove any existing entries that are being updated (same _id)
      const formattedIds = new Set(
        formattedNewDates.map((d: any) => String(d._id))
      );
      existingDeal.scheduleDates = (existingDeal.scheduleDates || []).filter(
        (existing: any) => !formattedIds.has(String(existing._id))
      );

      // Add new/updated
      existingDeal.scheduleDates.push(...formattedNewDates);

      // Sort ascending by date
      existingDeal.scheduleDates.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    // ---- Location sanitization (if provided) --------------------------------
    // Accepts either stringified JSON or object under updateData.location
    if (updateData.location != null) {
      const loc = safeParseJSON<any>(updateData.location);
      const sanitizedCountry = sanitizePlace(loc?.country);
      const sanitizedCity = sanitizePlace(loc?.city);

      if (!sanitizedCountry || !sanitizedCity) {
        res.status(400).json({
          success: false,
          message: "Country and city are required in location",
        });
        return;
      }

      // keep model shape the same
      existingDeal.location = {
        ...(existingDeal.location || {}),
        country: sanitizedCountry,
        city: sanitizedCity,
      };

      // remove from update bag so it doesn't overwrite the object above
      delete updateData.location;
    }

    // ---- Category casting (if provided) -------------------------------------
    if (updateData.category) {
      updateData.category = new mongoose.Types.ObjectId(updateData.category);
    }

    // ---- Apply remaining simple fields --------------------------------------
    const fieldsToUpdate = { ...updateData };
    delete fieldsToUpdate.scheduleDates;
    delete fieldsToUpdate.scheduleDatesToRemove;
    delete fieldsToUpdate.imagesToRemove;

    // Optional: trim shortDescription if present
    if (typeof fieldsToUpdate.shortDescription === "string") {
      fieldsToUpdate.shortDescription = fieldsToUpdate.shortDescription.trim();
    }

    Object.assign(existingDeal, fieldsToUpdate);
    existingDeal.images = finalImages;

    await existingDeal.save();

    const updatedDeal = await Deal.findById(id).populate("category");
    res.status(200).json({ success: true, deal: updatedDeal });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update deal",
      error: error.message,
    });
  }
};

export const changeDealStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find deal
    const currentDeal = await Deal.findById(id);
    if (!currentDeal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    // Toggle status
    const newStatus =
      currentDeal.status === "activate" ? "deactivate" : "activate";
    const isActivation = newStatus === "activate";

    // Update deal
    const deal = await Deal.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    ).populate("category");

    try {
      // Get users who want notifications
      const bookings = await Booking.find({
        dealsId: id,
        notifyMe: true,
      }).populate("userId");

      for (const booking of bookings) {
        const userdata = booking.userId as any;
        const userId = userdata._id as string;
        const userEmail = userdata.email as string | undefined;

        // Make a shared message for DB + realtime notifications
        const availabilityText = isActivation
          ? "verfügbar"
          : "nicht mehr verfügbar";
        const notificationMessage = `Der folgende Deal ist jetzt ${availabilityText}`;

        // Create DB notification
        const noti = await Notification.create({
          userId,
          message: notificationMessage,
          type: "deal_status_change",
          dealId: id,
        });

        // Real-time notification (socket)
        io.to(userId.toString()).emit("deal_status_change", {
          id: noti._id,
          message: notificationMessage,
          deal,
          newStatus,
        });

        // Email notification — ONLY on activation
        if (isActivation && userEmail) {
          const subject = "Dein Walk Through ist zurück!";
          const text = `Hey ${
            userdata.name || ""
          },\n\nder folgende Deal ist jetzt verfügbar:\n\n${
            deal?.title
          }\n\nViele Grüße\nDein Walk Throughz Team`;

          const html = `
  <div style="font-family: Arial, sans-serif; background:#2c2c2c; color:#ffffff; max-width:600px; margin:auto; border-radius:8px; overflow:hidden;">

    <!-- Header -->
    <div style="background:#222222; padding:20px; text-align:center;">
      <div style="
        background-image: url('https://res.cloudinary.com/dftvlksve/image/upload/v1756129458/Image20250819174530_hjqear.jpg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        height: 110px;
        max-width: 350px;
        margin: 0 auto;
      "></div>
    </div>

    <!-- Title -->
    <div style="text-align:center; padding:12px 20px 0;">
      <h1 style="font-size:20px; line-height:28px; margin:0; font-weight:700; color:#ffffff !important;">
        Dein Walk Through wartet!
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:20px; font-size:16px; line-height:24px; color:#ffffff !important;">
      <p style="margin:0 0 16px; color:#ffffff !important;">
        Hey ${userdata.name || "Nutzer"},
      </p>
      <p style="margin:0 0 16px; color:#ffffff !important;">
        der folgende Walk Through ist jetzt <strong>verfügbar</strong>:
      </p>

      <!-- Deal card -->
      <div style="background:#1a1a1a; padding:15px; border-radius:6px; margin:20px 0; color:#ffffff !important;">
        <strong>${deal?.title}</strong><br/>
        Kategorie: ${(deal?.category as any).categoryName || "Unbekannt"}
      </div>

      <!-- Sign-off -->
      <p style="margin:24px 0 0; font-size:14px; color:#ffffff !important; text-align:center;">
        Viele Grüße<br/>
        Dein <strong>Walk Throughz</strong> Team
      </p>
    </div>

  </div>
`;

          await sendMail(userEmail, subject, text, html);
        }
      }
    } catch (notificationError) {
      console.error("Failed to send notifications:", notificationError);
    }

    res.status(200).json({ success: true, deal });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to change deal status",
      error: error.message,
    });
  }
};

// export const changeDealStatus = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { id } = req.params;

//     // First find the current deal to get its status
//     const currentDeal = await Deal.findById(id);

//     if (!currentDeal) {
//       res.status(404).json({ success: false, message: "Deal not found" });
//       return;
//     }

//     // Toggle the status
//     const newStatus =
//       currentDeal.status === "activate" ? "deactivate" : "activate";

//     // Update with the new status and populate category
//     const deal = await Deal.findByIdAndUpdate(
//       id,
//       { status: newStatus },
//       { new: true }
//     ).populate("category");

//     try {
//       // Notify users who have notifyMe true for this deal
//       const bookings = await Booking.find({
//         dealsId: id,
//         notifyMe: true,
//       }).populate("userId");

//       // Notify each user who has notifyMe true
//       for (const booking of bookings) {
//         const userdata = booking.userId as any;
//         const userId = userdata._id;

//         const noti = await Notification.create({
//           userId,
//           message: `Der folgende Deal ist jetzt verfügbar`,
//           type: "deal_status_change",
//           dealId: id,
//         });

//         // User is connected, send real-time notification
//         io.to(userId.toString()).emit("deal_status_change", {
//           id: noti._id,
//           message: `Der folgende Deal ist jetzt verfügbar`,
//           deal,
//           newStatus,
//         });
//       }
//     } catch (notificationError) {
//       console.error("Failed to send notifications:", notificationError);
//       // Continue with the response even if notification fails
//     }

//     res.status(200).json({ success: true, deal });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to change deal status",
//       error: error.message,
//     });
//   }
// };

// Get available schedule dates for a deal
// export const getDealScheduleDates = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { id } = req.params
//     const deal = await Deal.findById(id)

//     if (!deal) {
//       res.status(404).json({ success: false, message: 'Deal not found' })
//       return
//     }

//     const now = new Date()
//     const availableDates = deal.scheduleDates
//       .filter(
//         (s) =>
//           typeof s === 'object' &&
//           s !== null &&
//           'active' in s &&
//           'date' in s &&
//           'participationsLimit' in s &&
//           (s as any).active &&
//           (s as any).date >= now &&
//           ((s as any).participationsLimit === 0 ||
//             ((s as any).bookedCount || 0) < (s as any).participationsLimit)
//       )
//       .map((s) => ({
//         date: (s as any).date,
//         time: (s as any).time,
//         spotsLeft: (s as any).participationsLimit
//           ? (s as any).participationsLimit - ((s as any).bookedCount || 0)
//           : null,
//       }))

//     res.status(200).json({
//       success: true,
//       dates: availableDates,
//     })
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch schedule dates',
//       error: error.message,
//     })
//   }
// }

export const getDealScheduleDates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const deal = await Deal.findById(id);

    if (!deal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    const now = new Date();

    // Initialize result array
    const availableDates = await Promise.all(
      deal.scheduleDates.map(async (s: any) => {
        if (
          typeof s !== "object" ||
          !s?.active ||
          !s?.date ||
          new Date(s.date) < now
        ) {
          return null; // skip invalid or past dates
        }

        // Sum quantity of all bookings for this deal & date
        const totalBooked = await Booking.aggregate([
          {
            $match: {
              dealsId: deal._id,
              isBooked: true,
              scheduleDate: new Date(s.date),
            },
          },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: "$quantity" },
            },
          },
        ]);

        const bookedCount =
          totalBooked.length > 0 ? totalBooked[0].totalQuantity : 0;
        const spotsLeft = s.participationsLimit
          ? s.participationsLimit - bookedCount
          : Infinity;

        if (s.participationsLimit && spotsLeft <= 0) {
          return null; // no spots left
        }

        return {
          date: s.date,
          time: s.time,
          spotsLeft: spotsLeft ?? undefined,
        };
      })
    );

    // Filter out nulls (unavailable dates)
    const filteredDates = availableDates.filter(Boolean);

    res.status(200).json({
      success: true,
      dates: filteredDates,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedule dates",
      error: error.message,
    });
  }
};

/***************************
 * TOGGLE TIMER ON AND OFF *
 ***************************/
export const toggleTimer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const deal = await Deal.findById(id);

    if (!deal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    if (deal.timer === "on") {
      deal.timer = "off";
    } else {
      deal.timer = "on";
    }

    const updatedDeal = await deal.save();
    res.status(200).json({ success: true, deal: updatedDeal });
  }
);


// Toggle popularDeals field
export const togglePopularDeals = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const deal = await Deal.findById(id);

    if (!deal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    deal.popularDeals = !deal.popularDeals;

    const updatedDeal = await deal.save();
    res.status(200).json({ success: true, deal: updatedDeal });
  }
);
// Get all popular deals
export const getPopularDeals = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const popularDeals = await Deal.find({
      popularDeals: true,
      status: "activate",
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
      ],
    })
      .populate("category")
      .sort({ createdAt: -1 }); // optional: latest first

    res.status(200).json({
      success: true,
      count: popularDeals.length,
      deals: popularDeals,
    });
  }
);

// Routes (for reference, not part of the controller file)

