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
        const baseTime = deal.updatedAt ?? deal.createdAt ?? new Date()
        const expirationDate = new Date(baseTime)

        // Add deal.time (in minutes) to the base time
        expirationDate.setMinutes(
          expirationDate.getMinutes() + (deal.time || 0)
        )

        if (now >= expirationDate) {
          expiredDealIds.push(deal._id)
        }

      });      if (expiredDealIds.length > 0) {
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
  })}
