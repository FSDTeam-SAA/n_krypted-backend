const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Review = require('../dist/src/models/Review.model').default
const { distanceKm, validCoordinates, escapeSearch, enrichRestaurants } = require('../dist/src/utils/discovery')

test('map distance handles coincident, zero, far-away and invalid coordinates', () => {
  assert.equal(distanceKm(0, 0, 0, 0), 0)
  assert.ok(Math.abs(distanceKm(0, 0, 0, 1) - 111.195) < .01)
  assert.ok(Number.isFinite(distanceKm(0, 0, 0, 180)))
  assert.equal(validCoordinates(0, 0), true)
  for (const [lat, lng] of [[null, 0], [undefined, 0], [91, 0], [0, 181], [NaN, 0]]) {
    assert.equal(validCoordinates(lat, lng), false)
  }
})
test('search metacharacters are treated as literal text', () => {
  const name = 'House (A+B) [special].*'
  assert.ok(new RegExp(escapeSearch(name)).test(name))
  assert.equal(new RegExp(escapeSearch(name)).test('House AAAAB special'), false)
})
test('public dish ratings are weighted persisted reviews, excluding inactive dishes', async () => {
  const restaurantId = new mongoose.Types.ObjectId()
  const first = new mongoose.Types.ObjectId(), second = new mongoose.Types.ObjectId()
  const original = Review.aggregate
  Review.aggregate = async () => [
    { _id: { restaurant: restaurantId, dish: first }, count: 1, total: 5 },
    { _id: { restaurant: restaurantId, dish: second }, count: 3, total: 9 },
  ]
  try {
    const [restaurant] = await enrichRestaurants([{ _id: restaurantId, dishes: [
      { _id: first, isActive: true }, { _id: second, isActive: true },
      { _id: new mongoose.Types.ObjectId(), isActive: false },
    ] }])
    assert.equal(restaurant.rating, 3.5)
    assert.equal(restaurant.reviewCount, 4)
    assert.equal(restaurant.dishes.length, 2)
    assert.equal(restaurant.dishes[0].rating, 5)
    assert.equal(restaurant.dishes[1].rating, 3)
  } finally { Review.aggregate = original }
})
