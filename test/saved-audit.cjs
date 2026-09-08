// Read-only database audit. Does not create users, saves, or restaurant data.
require('dotenv').config({ quiet: true })
const mongoose = require('mongoose')
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
  const items = await mongoose.connection.collection('saveditems').aggregate([
    { $lookup: { from: 'deals', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
    { $project: { _id: 0, dishId: 1, title: { $arrayElemAt: ['$restaurant.title', 0] } } },
  ]).toArray()
  console.log(JSON.stringify({ savedCount: items.length, items }))
}
main().catch(() => { console.error('Saved database audit failed'); process.exitCode = 1 }).finally(() => mongoose.disconnect())
