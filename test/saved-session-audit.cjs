// Pipe the debug app's preferences via stdin. Never prints or stores its token.
const fs = require('node:fs')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
require('dotenv').config({ quiet: true })
async function main() {
  const xml = fs.readFileSync(0, 'utf8')
  const token = xml.match(/<string name="flutter\.nk_token">([^<]+)<\/string>/)?.[1]
  if (!token) throw new Error('No saved app session')
  const response = await fetch('http://127.0.0.1:5000/api/saved', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(response.status, 200, 'Saved endpoint rejected session')
  const payload = await response.json()
  const user = require('jsonwebtoken').decode(token)
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
  const records = await mongoose.connection.collection('saveditems').find({ userId: new mongoose.Types.ObjectId(user.id) }).toArray()
  for (const item of payload.items) assert.ok(records.some(row => String(row.restaurantId) === item.restaurant._id && (row.dishId || '') === (item.dishId || '')))
  console.log(JSON.stringify({ databaseSavedCount: records.length, apiSavedCount: payload.items.length, restaurants: payload.items.map(item => item.restaurant.title) }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => mongoose.disconnect())
