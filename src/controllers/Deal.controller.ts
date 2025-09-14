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
export const createDeal = async (req: Request, res: Response): Promise<void> => {
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
      res.status(400).json({ success: false, message: "Description is required" });
      return;
    }
    if (!price && price !== 0) {
      res.status(400).json({ success: false, message: "Price is required" });
      return;
    }

    // If the schema has shortDescription: { required: true }, enforce it here:
    if (!normalizedShort) {
      res.status(400).json({ success: false, message: "shortDescription is required" });
      return;
    }

    // Parse location string (coming from form-data)
    let country = "";
    let city = "";
    try {
      const parsedLocation = JSON.parse(req.body.location);
      country = parsedLocation.country;
      city = parsedLocation.city;
    } catch (e) {
      res.status(400).json({
        success: false,
        message: "Invalid location format. Expected JSON string.",
      });
      return;
    }

    // Parse and validate schedule dates
    let parsedScheduleDates: ScheduleDate[] = [];
    try {
      parsedScheduleDates =
        typeof scheduleDates === "string" ? JSON.parse(scheduleDates) : scheduleDates;

      parsedScheduleDates = parsedScheduleDates.map((dateInfo: any) => {
        const date = new Date(dateInfo.date);
        if (isNaN(date.getTime())) throw new Error("Invalid date format");
        return {
          date,
          active: true,
          participationsLimit: dateInfo.participationsLimit || participationsLimit || 0,
          time: dateInfo.time || time || null,
          bookedCount: 0,
        };
      });

      parsedScheduleDates.sort((a, b) => a.date.getTime() - b.date.getTime());
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
      const uploadPromises = (req.files as Express.Multer.File[]).map(async (file) => {
        const compressedBuffer = await sharp(file.buffer).jpeg({ quality: 80 }).toBuffer();
        return new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            (error, result) => (error ? reject(error) : resolve(result?.secure_url || ""))
          );
          stream.end(compressedBuffer);
        });
      });
      images = await Promise.all(uploadPromises);
    }

    const location = { country, city };

    // Create the deal
    const deal = new Deal({
      title,
      shortDescription: normalizedShort, // 👈 persist it
      description,
      price,
      location,
      images,
      offers: typeof offers === "string" ? JSON.parse(offers) : [],
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
    res.status(500).json({ success: false, message: "Failed to create deal", error: error.message });
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
    const deal = await Deal.findById(id).populate("category");

    if (!deal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    // Calculate booking count for each schedule date
    const bookingCounts = await Promise.all(
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
    );

    res.status(200).json({
      success: true,
      deal: {
        ...deal.toObject(),
        bookingCounts,
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
      title,
      page = "1",
      limit = "10",
      status,
      showAll = "false",
    } = req.query as {
      categoryName?: string;
      minPrice?: string;
      maxPrice?: string;
      country?: string;
      city?: string;
      title?: string;
      page?: string;
      limit?: string;
      status?: string;
      showAll?: string;
    };

    const pageNumber = parseInt(page, 10);
    const itemsPerPage = parseInt(limit, 10);
    const skip = (pageNumber - 1) * itemsPerPage;

    const filter: any = {};

    // Only apply status and schedule date filters if not showing all
    if (showAll !== "true") {
      filter.status = status || "activate";
      filter["scheduleDates.active"] = true;
      filter["scheduleDates.date"] = { $gte: new Date() };
    }

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

    // Filter by specific status if provided
    if (status) {
      filter.status = status;
    }

    const totalItems = await Deal.countDocuments(filter);

    const deals = await Deal.find(filter)
      .populate("category")
      .skip(skip)
      .limit(itemsPerPage)
      .sort({ createdAt: -1 });

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

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const pagination: MetaPagination = {
      currentPage: pageNumber,
      totalPages,
      totalItems,
      itemsPerPage,
    };

    res.status(200).json({
      success: true,
      deals: enrichedDeals,
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

/*****************
 * UPDATE A DEAL *
 *****************/

export const updateDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const updateData = { ...req.body };
    let imagesToRemove: string[] = [];

    if (typeof updateData.imagesToRemove === "string") {
      imagesToRemove = JSON.parse(updateData.imagesToRemove);
    }

    // Get existing deal
    const existingDeal = await Deal.findById(id);
    if (!existingDeal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    // Handle images
    let finalImages = existingDeal.images || [];
    finalImages = finalImages.filter((img) => !imagesToRemove.includes(img));

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
    finalImages = [...finalImages, ...newImages];

    // ---- Schedule Dates Handling ----

    // 1. First handle removals if any
    if (updateData.scheduleDatesToRemove) {
      const scheduleDatesToRemove =
        typeof updateData.scheduleDatesToRemove === "string"
          ? JSON.parse(updateData.scheduleDatesToRemove)
          : updateData.scheduleDatesToRemove;

      existingDeal.scheduleDates = existingDeal.scheduleDates?.filter(
        (sd) => !scheduleDatesToRemove.includes(sd._id?.toString() as any)
      );
    }

    // 2. Then handle additions if any (merge with existing)
    if (updateData.scheduleDates) {
      const newScheduleDates =
        typeof updateData.scheduleDates === "string"
          ? JSON.parse(updateData.scheduleDates)
          : updateData.scheduleDates;

      const formattedNewDates = newScheduleDates.map((dateInfo: any) => ({
        date: new Date(dateInfo.date),
        active: dateInfo.active !== false,
        participationsLimit: dateInfo.participationsLimit || 0,
        time: dateInfo.time || null,
        bookedCount: dateInfo.bookedCount || 0,
        _id: dateInfo._id || new mongoose.Types.ObjectId(), // Preserve ID if updating, or create new
      }));

      // Merge new dates with existing ones
      // First filter out any existing dates that might be updated (same _id)
      existingDeal.scheduleDates = existingDeal.scheduleDates?.filter(
        (existing) =>
          !formattedNewDates.some(
            (newDate: any) =>
              newDate._id &&
              (existing._id?.toString() as any) === newDate._id.toString()
          )
      );

      // Then add all new/updated dates
      existingDeal.scheduleDates?.push(...formattedNewDates);
    }

    // Update other fields
    if (updateData.category) {
      updateData.category = new mongoose.Types.ObjectId(updateData.category);
    }

    // Apply updates to other fields excluding scheduleDates related fields
    const fieldsToUpdate = { ...updateData };
    delete fieldsToUpdate.scheduleDates;
    delete fieldsToUpdate.scheduleDatesToRemove;
    delete fieldsToUpdate.imagesToRemove;

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
    const { id } = req.params

    // Find deal
    const currentDeal = await Deal.findById(id)
    if (!currentDeal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
      return
    }

    // Toggle status
    const newStatus =
      currentDeal.status === 'activate' ? 'deactivate' : 'activate'

    // Update deal
    const deal = await Deal.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    ).populate('category')

    try {
      // Get users who want notifications
      const bookings = await Booking.find({
        dealsId: id,
        notifyMe: true,
      }).populate('userId')

      for (const booking of bookings) {
        const userdata = booking.userId as any
        const userId = userdata._id
        const userEmail = userdata.email

        // Create DB notification
        const noti = await Notification.create({
          userId,
          message: `Der folgende Deal ist jetzt ${
            newStatus === 'activate' ? 'verfügbar' : 'nicht mehr verfügbar'
          }`,
          type: 'deal_status_change',
          dealId: id,
        })

        // Real-time notification
        io.to(userId.toString()).emit('deal_status_change', {
          id: noti._id,
          message: `Der folgende Deal ist jetzt ${
            newStatus === 'activate' ? 'verfügbar' : 'nicht mehr verfügbar'
          }`,
          deal,
          newStatus,
        })

        // Email notification
        if (userEmail) {
          const subject =
            newStatus === 'activate'
              ? 'Deal ist jetzt verfügbar!'
              : 'Deal wurde deaktiviert'

          const text = `Hallo ${
            userdata.name || ''
          },\n\nDer folgende Deal ist jetzt ${
            newStatus === 'activate' ? 'verfügbar' : 'nicht mehr verfügbar'
          }:\n\n${deal?.title}\n\nViele Grüße\nDein Walk Throughz Team`

          const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #ccc; border-radius: 8px;">
              <h2 style="text-align: center; color: #000;">
                ${
                  newStatus === 'activate'
                    ? 'Deal verfügbar!'
                    : 'Deal deaktiviert'
                }
              </h2>
              <p style="font-size: 16px; color: #000;">
                Hallo ${userdata.name || 'Nutzer'},
              </p>
              <p style="font-size: 16px; color: #000;">
                Der folgende Deal ist jetzt <strong>${
                  newStatus === 'activate'
                    ? 'verfügbar'
                    : 'nicht mehr verfügbar'
                }</strong>:
              </p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>${deal?.title}</strong><br/>
                Kategorie: ${(deal?.category as any)?.name || 'Unbekannt'}
              </div>
              <p style="font-size: 14px; color: #000; text-align: center;">
                Viele Grüße,<br/>
                Dein <strong>Walk Throughz</strong> Team
              </p>
            </div>
          `

          await sendMail(userEmail, subject, text, html)
        }
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError)
    }

    res.status(200).json({ success: true, deal })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to change deal status',
      error: error.message,
    })
  }
}

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
