import { Request, Response } from "express";
import Booking from "../models/Booking.model";
import crypto from "crypto";
import Deal from "../models/Deal.model";
import { MetaPagination } from "./Deal.controller";
import User from "../models/User.model"; // Assuming you have a User model


// export const createBooking = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const {
//       dealsId,
//       notifyMe,
//       userId,
//       isBooked,
//       scheduleDate,
//       quantity,
//       price,
//     } = req.body;

//     // Validate required fields
//     if (!dealsId || !scheduleDate || !userId) {
//       res.status(400).json({
//         success: false,
//         message: "Deal ID, user ID and schedule date are required",
//       });
//       return;
//     }

//     const deal = await Deal.findById(dealsId);
//     if (!deal) {
//       res.status(404).json({ success: false, message: "Deal not found" });
//       return;
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       res.status(404).json({ success: false, message: "User not found" });
//       return;
//     }

//     // 🔹 Helper: Check if notifyMe booking already exists
//     const checkExistingNotifyMe = async () => {
//       const existing = await Booking.findOne({
//         userId,
//         dealsId,
//         scheduleDate: new Date(scheduleDate),
//         notifyMe: true,
//       });
//       return !!existing;
//     };

//     // Check if deal is deactivated
//     if (deal.status === "deactivate") {
//       if (await checkExistingNotifyMe()) {
//         res.status(400).json({
//           success: false,
//           message:
//             "Du hast dich bereits für Benachrichtungen zu diesem Deal angemeldet.",
//         });
//         return;
//       }

//       const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
//       const booking = await Booking.create({
//         userId,
//         bookingId,
//         dealsId,
//         quantity,
//         scheduleDate: new Date(scheduleDate),
//         notifyMe: true,
//         isBooked: false,
//       });

//       res.status(201).json({
//         success: true,
//         booking,
//         message:
//           "Deal is deactivated - You will be notified if it becomes available again",
//         dealStatus: deal.status,
//       });
//       return;
//     }

//     // Find the specific schedule date
//     type ScheduleDate = {
//       date: Date | string;
//       active?: boolean;
//       participationsLimit?: number;
//       bookedCount?: number;
//     };

//     const scheduleDates: ScheduleDate[] = Array.isArray(deal.scheduleDates)
//       ? deal.scheduleDates.map((s: any) =>
//           typeof s === "object" && s !== null && "date" in s ? s : { date: s }
//         )
//       : [];

//     const schedule = scheduleDates.find(
//       (s) =>
//         (s.date instanceof Date
//           ? s.date.toISOString()
//           : new Date(s.date).toISOString()) ===
//         new Date(scheduleDate).toISOString()
//     );

//     if (!schedule) {
//       res.status(400).json({
//         success: false,
//         message: "Selected date not available for this deal",
//       });
//       return;
//     }

//     // Check if date is active
//     if (typeof schedule.active !== "undefined" && !schedule.active) {
//       if (await checkExistingNotifyMe()) {
//         res.status(400).json({
//           success: false,
//           message:
//             "Du hast dich bereits für Benachrichtungen zu diesem Deal angemeldet.",
//         });
//         return;
//       }

//       const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
//       const booking = await Booking.create({
//         userId,
//         bookingId,
//         dealsId,
//         quantity,
//         price,
//         scheduleDate: new Date(scheduleDate),
//         notifyMe: true,
//         isBooked: false,
//       });

//       res.status(201).json({
//         success: true,
//         booking,
//         message:
//           "Selected date is no longer available - You will be notified if it becomes available again",
//         dealStatus: deal.status,
//       });
//       return;
//     }

//     // Check participation limit
//     if (
//       (schedule.participationsLimit ?? 0) > 0 &&
//       (schedule.bookedCount ?? 0) >= (schedule.participationsLimit ?? 0)
//     ) {
//       if (await checkExistingNotifyMe()) {
//         res.status(400).json({
//           success: false,
//           message:
//             "Du hast dich bereits für Benachrichtungen zu diesem Deal angemeldet.",
//         });
//         return;
//       }

//       const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
//       const booking = await Booking.create({
//         userId,
//         bookingId,
//         price,
//         dealsId,
//         quantity,
//         scheduleDate: new Date(scheduleDate),
//         notifyMe: true,
//         isBooked: false,
//       });

//       res.status(201).json({
//         success: true,
//         booking,
//         message:
//           "Selected date is fully booked - You will be notified if spots become available",
//         dealStatus: deal.status,
//       });
//       return;
//     }

//     // If we get here, create a normal booking
//     const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
//     const booking = await Booking.create({
//       userId,
//       bookingId,
//       price,
//       dealsId,
//       quantity,
//       scheduleDate: new Date(scheduleDate),
//       notifyMe: notifyMe || false,
//       isBooked: isBooked || false,
//     });

//     // Update booked count
//     schedule.bookedCount = (schedule.bookedCount ?? 0) + (quantity || 1);

//     await deal.save();

//     res.status(201).json({
//       success: true,
//       message: "Booking successfull!",
//       booking,
//       dealStatus: deal.status,
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to create booking",
//       error: error.message,
//     });
//   }
// };


export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      dealsId,
      notifyMe,
      userId,
      isBooked,
      scheduleDate,
      quantity,
      price,
    } = req.body;

    // Validate required fields
    if (!dealsId || !scheduleDate || !userId) {
      res.status(400).json({
        success: false,
        message: "Deal ID, user ID and schedule date are required",
      });
      return;
    }

    const deal = await Deal.findById(dealsId);
    if (!deal) {
      res.status(404).json({ success: false, message: "Deal not found" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // 🔹 Helper: Check if notifyMe booking already exists
    const checkExistingNotifyMe = async () => {
      const existing = await Booking.findOne({
        userId,
        dealsId,
        scheduleDate: new Date(scheduleDate),
        notifyMe: true,
      });
      return !!existing;
    };

    // Check if deal is deactivated
    if (deal.status === "deactivate") {
      if (await checkExistingNotifyMe()) {
        res.status(400).json({
          success: false,
          message:
            "Du hast dich bereits für Benachrichtungen zu diesem Deal angemeldet.",
        });
        return;
      }

      const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
      const booking = await Booking.create({
        userId,
        bookingId,
        dealsId,
        quantity,
        scheduleDate: new Date(scheduleDate),
        notifyMe: true,
        isBooked: false,
      });

      res.status(201).json({
        success: true,
        booking,
        message:
          "Deal is deactivated - You will be notified if it becomes available again",
        dealStatus: deal.status,
      });
      return;
    }

    // Find the specific schedule date
    type ScheduleDate = {
      date: Date | string;
      active?: boolean;
      participationsLimit?: number;
      bookedCount?: number;
    };

    const scheduleDates: ScheduleDate[] = Array.isArray(deal.scheduleDates)
      ? deal.scheduleDates.map((s: any) =>
          typeof s === "object" && s !== null && "date" in s ? s : { date: s }
        )
      : [];

    const schedule = scheduleDates.find(
      (s) =>
        (s.date instanceof Date
          ? s.date.toISOString()
          : new Date(s.date).toISOString()) ===
        new Date(scheduleDate).toISOString()
    );

    if (!schedule) {
      res.status(400).json({
        success: false,
        message: "Selected date not available for this deal",
      });
      return;
    }

    // Check if date is active
    if (typeof schedule.active !== "undefined" && !schedule.active) {
      if (await checkExistingNotifyMe()) {
        res.status(400).json({
          success: false,
          message:
            "Du hast dich bereits für Benachrichtungen zu diesem Deal angemeldet.",
        });
        return;
      }

      const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
      const booking = await Booking.create({
        userId,
        bookingId,
        dealsId,
        quantity,
        price,
        scheduleDate: new Date(scheduleDate),
        notifyMe: true,
        isBooked: false,
      });

      res.status(201).json({
        success: true,
        booking,
        message:
          "Selected date is no longer available - You will be notified if it becomes available again",
        dealStatus: deal.status,
      });
      return;
    }

    // Check participation limit
    if (
      (schedule.participationsLimit ?? 0) > 0 &&
      (schedule.bookedCount ?? 0) >= (schedule.participationsLimit ?? 0)
    ) {
      if (await checkExistingNotifyMe()) {
        res.status(400).json({
          success: false,
          message:
            "Du hast dich bereits für Benachrichtungen zu diesem Deal angemeldet.",
        });
        return;
      }

      const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
      const booking = await Booking.create({
        userId,
        bookingId,
        price,
        dealsId,
        quantity,
        scheduleDate: new Date(scheduleDate),
        notifyMe: true,
        isBooked: false,
      });

      res.status(201).json({
        success: true,
        booking,
        message:
          "Selected date is fully booked - You will be notified if spots become available",
        dealStatus: deal.status,
      });
      return;
    }

    // If we get here, create a normal booking
    const bookingId = crypto.randomBytes(5).toString("hex").toUpperCase();
    const booking = await Booking.create({
      userId,
      bookingId,
      price,
      dealsId,
      quantity,
      scheduleDate: new Date(scheduleDate),
      notifyMe: notifyMe || false,
      isBooked: isBooked || false,
    });

    // Update booked count
    // schedule.bookedCount = (schedule.bookedCount ?? 0) + (quantity || 1);

    await deal.save();

    res.status(201).json({
      success: true,
      message: "Booking successfull!",
      booking,
      dealStatus: deal.status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
    });
  }
};


export const getBookingsNotifyFalse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.query.user;
    console.log("userID__", userId);
    const bookings = await Booking.find({ userId, notifyMe: false })
      .populate("dealsId")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// Get all bookings by userId where notifyMe is true
export const getBookingsNotifyTrue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.query.user as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId || typeof userId !== "string") {
      res
        .status(400)
        .json({ success: false, message: "Invalid or missing user ID" });
      return;
    }

    const skip = (page - 1) * limit;

    const [totalItems, bookings] = await Promise.all([
      Booking.countDocuments({ userId, notifyMe: true }),
      Booking.find({ userId, notifyMe: true })
        .populate("dealsId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const pagination: MetaPagination = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    };

    res.status(200).json({
      success: true,
      data: bookings,
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// Get all bookings
export const getAllBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter = { notifyMe: false, paymentStatus: "complete" };

    const [totalItems, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate({
          path: "userId",
          select: "name email phoneNumber ", // Only include these fields
        })
        .populate("dealsId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const pagination: MetaPagination = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    };

    res.status(200).json({
      success: true,
      data: bookings,
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch all bookings",
      error: error.message,
    });
  }
};

// Get single booking
export const getSingleBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log("first", id);
    const booking = await Booking.findById(id).populate("dealsId");

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

// Update booking
export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { ...updates },
      { new: true }
    ).populate("dealsId");

    res.status(200).json({ success: true, booking: updatedBooking });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update booking",
      error: error.message,
    });
  }
};

// Delete booking
export const deleteBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    await booking.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Booking deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete booking",
      error: error.message,
    });
  }
};

// Get all booked bookings (notifyMe: true)
export const getBookedBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter = { notifyMe: true };

    const [bookings, totalItems] = await Promise.all([
      Booking.find(filter)
        .populate("dealsId")
        .populate("userId", "name email phoneNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch booked bookings",
      error: error.message,
    });
  }
};
