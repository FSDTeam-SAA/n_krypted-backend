import cron from 'node-cron'
import Deal from '../models/Deal.model'
import Booking from '../models/Booking.model'
import Notification from '../models/Notification.model'
import { io } from '../server'

export const deactivateExpiredDeals = () => {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date()

      const dealsToUpdate = await Deal.find({
        $or: [
          { 'scheduleDates.active': true, 'scheduleDates.date': { $lte: now } },
          {
            'scheduleDates.active': true,
            'scheduleDates.participationsLimit': { $gt: 0 },
            'scheduleDates.bookedCount': { $exists: true },
          },
          { status: 'activate' },
        ],
      })

      for (const deal of dealsToUpdate) {
        let shouldUpdateDeal = false
        let hasActiveDates = false

        const updatedScheduleDates = (deal.scheduleDates as any[]).map(
          (schedule) => {
            const isPastDate = schedule.date <= now
            const isFullyBooked =
              (schedule.participationsLimit ?? 0) > 0 &&
              (schedule.bookedCount ?? 0) >= schedule.participationsLimit

            if (schedule.active && (isPastDate || isFullyBooked)) {
              shouldUpdateDeal = true
              return { ...(schedule.toObject?.() ?? schedule), active: false }
            }

            if (
              schedule.active &&
              schedule.date > now &&
              (!schedule.participationsLimit ||
                (schedule.bookedCount ?? 0) < schedule.participationsLimit)
            ) {
              hasActiveDates = true
            }

            return schedule
          }
        )

        // More robust status determination
        const newStatus = hasActiveDates ? 'activate' : 'deactivate'

        // Always update if status needs to change, regardless of date changes
        if (deal.status !== newStatus || shouldUpdateDeal) {
          const updateData: any = {
            status: newStatus,
          }

          if (shouldUpdateDeal) {
            updateData.scheduleDates = updatedScheduleDates
          }

          await Deal.findByIdAndUpdate(deal._id, updateData)

          // Notification logic remains the same
          if (newStatus === 'deactivate' && deal.status === 'activate') {
            const bookings = await Booking.find({
              dealsId: deal._id,
              notifyMe: true,
            }).populate('userId')

            for (const booking of bookings) {
              const user = booking.userId as any
              const notification = await Notification.create({
                userId: user._id,
                message: `Deal "${deal.title}" has been deactivated as all dates have passed or are fully booked.`,
                type: 'deal_status_change',
                dealId: deal._id,
              })

              io.to(user._id.toString()).emit('deal_status_change', {
                id: notification._id,
                message: `Deal "${deal.title}" is no longer available`,
                deal: { ...deal.toObject(), status: 'deactivate' },
                newStatus: 'deactivate',
              })

              // ✅ Send email notification
              // if (user.email) {
              //   const subject = `Deal "${deal.title}" wurde deaktiviert`
              //   const text = `Hallo ${user.name || ''},\n\nDer Deal "${
              //     deal.title
              //   }" ist nicht mehr verfügbar, da alle Termine vorbei sind oder ausgebucht wurden.\n\nViele Grüße\nDein Walk Throughz Team`

              //   const html = `
              //     <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #ccc; border-radius: 8px;">
              //       <h2 style="text-align: center; color: #000;"> Deal deaktiviert</h2>
              //       <p style="font-size: 16px; color: #000;">
              //         Hallo ${user.name || 'Nutzer'},
              //       </p>
              //       <p style="font-size: 16px; color: #000;">
              //         Der Deal <strong>${
              //           deal.title
              //         }</strong> ist <strong>nicht mehr verfügbar</strong>,
              //         da alle Termine vorbei sind oder ausgebucht wurden.
              //       </p>
              //       <p style="font-size: 14px; color: #000; text-align: center;">
              //         Viele Grüße,<br/>
              //         Dein <strong>Walk Throughz</strong> Team
              //       </p>
              //     </div>
              //   `

              //   await sendMail(user.email, subject, text, html)
              // }
            }
          }
        }
      }

      console.log(`[${new Date().toISOString()}] Deal status update completed.`)

      // Timer logic remains the same
      const dealsWithTimer = await Deal.find({
        timer: 'on',
        time: { $ne: null },
      })

      for (const deal of dealsWithTimer) {
        const updatedAt = deal.updatedAt ? new Date(deal.updatedAt) : null
        if (!updatedAt) continue

        const endTime = new Date(
          updatedAt.getTime() + (deal.time || 0) * 60 * 1000
        )

        if (now >= endTime) {
          await Deal.findByIdAndUpdate(deal._id, { timer: 'off' })
          console.log(
            `Timer turned off for deal "${deal.title}" (ID: ${deal._id}) – duration ended.`
          )
        }
      }
    } catch (error) {
      console.error('Error in deal status update job:', error)
    }
  })
}
