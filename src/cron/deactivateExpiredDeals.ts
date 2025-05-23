// cron/deactivateExpiredDeals.ts
import cron from 'node-cron'
import Deal from '../models/Deal.model'
import mongoose from 'mongoose'

export const deactivateExpiredDeals = () => {
  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date()

      // Get all active deals
      const activeDeals = await Deal.find({ status: 'activate' })

      const expiredDealIds: mongoose.Types.ObjectId[] = []

      activeDeals.forEach((deal) => {
        try {
          // Choose base time: updatedAt -> createdAt -> fallback to now
          const baseTimeCandidate = deal.updatedAt ?? deal.createdAt

          // Ensure baseTime is a valid Date object
          const baseTime =
            baseTimeCandidate instanceof Date &&
            !isNaN(baseTimeCandidate.getTime())
              ? baseTimeCandidate
              : new Date()

          const expirationDate = new Date(baseTime)
          expirationDate.setMinutes(
            expirationDate.getMinutes() + (deal.time || 0)
          )

          if (now >= expirationDate) {
            expiredDealIds.push(deal._id)
          }
        } catch (innerError) {
          console.error(`Failed to process deal ID: ${deal._id}`, innerError)
        }
      })

      if (expiredDealIds.length > 0) {
        await Deal.updateMany(
          { _id: { $in: expiredDealIds } },
          { $set: { status: 'deactivate' } }
        )

        console.log(
          `${expiredDealIds.length} deals deactivated at ${now.toISOString()}`
        )
      }
    } catch (error) {
      console.error('Error deactivating deals:', error)
    }
  })
}
