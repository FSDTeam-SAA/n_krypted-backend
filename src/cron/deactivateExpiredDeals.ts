import cron from "node-cron";
import Deal from "../models/Deal.model";
import Booking from "../models/Booking.model";
import Notification from "../models/Notification.model";
import { io } from "../server";

export const deactivateExpiredDeals = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const now = new Date();

      // Keep the query simple: check active deals and any that may need schedule cleanup
      const dealsToUpdate = await Deal.find({
        $or: [
          { status: "activate" }, // we only *deactivate* from active
          { "scheduleDates.active": true }, // in case entries need flipping to false
          { timer: "on" }, // timer maintenance
        ],
      });

      for (const deal of dealsToUpdate) {
        let shouldUpdateDeal = false;
        let hasActiveDates = false;

        const updatedScheduleDates = ((deal.scheduleDates as any[]) ?? []).map(
          (schedule) => {
            const isPastDate = schedule.date && new Date(schedule.date) <= now;
            const limit = schedule.participationsLimit ?? 0;
            const booked = schedule.bookedCount ?? 0;
            const isFullyBooked = limit > 0 && booked >= limit;

            if (schedule.active && (isPastDate || isFullyBooked)) {
              shouldUpdateDeal = true;
              return { ...(schedule.toObject?.() ?? schedule), active: false };
            }

            if (
              schedule.active &&
              schedule.date &&
              new Date(schedule.date) > now &&
              (limit === 0 || booked < limit)
            ) {
              hasActiveDates = true;
            }

            return schedule;
          }
        );

        // ❌ Do not auto-activate. Only deactivate if there are no valid active dates.
        const shouldDeactivate = !hasActiveDates && deal.status === "activate"; // CHANGED

        if (shouldUpdateDeal || shouldDeactivate) {
          const updateData: any = {};

          if (shouldUpdateDeal) {
            updateData.scheduleDates = updatedScheduleDates;
          }

          if (shouldDeactivate) {
            updateData.status = "deactivate"; // CHANGED
          }

          if (Object.keys(updateData).length > 0) {
            await Deal.findByIdAndUpdate(deal._id, updateData);

            // Notify users only when we *actually* turned it off
            if (shouldDeactivate) {
              const bookings = await Booking.find({
                dealsId: deal._id,
                notifyMe: true,
              }).populate("userId");

              for (const booking of bookings) {
                const user = booking.userId as any;
                const notification = await Notification.create({
                  userId: user._id,
                  message: `Deal "${deal.title}" has been deactivated as all dates have passed or are fully booked.`,
                  type: "deal_status_change",
                  dealId: deal._id,
                });

                io.to(user._id.toString()).emit("deal_status_change", {
                  id: notification._id,
                  message: `Deal "${deal.title}" is no longer available`,
                  deal: { ...deal.toObject(), status: "deactivate" },
                  newStatus: "deactivate",
                });

                // email sending code (optional)...
              }
            }
          }
        }
      }

      console.log(
        `[${new Date().toISOString()}] Deal status update completed.`
      );

      // Timer maintenance (unchanged)
      const dealsWithTimer = await Deal.find({
        timer: "on",
        time: { $ne: null },
      });

      for (const deal of dealsWithTimer) {
        const updatedAt = deal.updatedAt ? new Date(deal.updatedAt) : null;
        if (!updatedAt) continue;

        const endTime = new Date(
          updatedAt.getTime() + (deal.time || 0) * 60 * 1000
        );

        if (now >= endTime) {
          await Deal.findByIdAndUpdate(deal._id, { timer: "off" });
          console.log(
            `Timer turned off for deal "${deal.title}" (ID: ${deal._id}) – duration ended.`
          );
        }
      }
    } catch (error) {
      console.error("Error in deal status update job:", error);
    }
  });
};
