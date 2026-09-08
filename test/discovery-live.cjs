// Read-only smoke checks against the configured development database via HTTP.
const assert = require('node:assert/strict')
const base = process.env.API_BASE_URL || 'http://localhost:5000/api'
async function get(path) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200, path)
  return response.json()
}
async function main() {
  const all = await get('/deals?limit=100')
  for (const item of all.deals) {
    assert.equal(item.status, 'activate')
    assert.ok(!item.approvalStatus || item.approvalStatus === 'approved')
    assert.ok(item.dishes.every(dish => dish.isActive !== false))
    assert.ok(item.rating >= 0 && item.rating <= 5)
  }
  const options = await get('/discovery/options')
  if (options.cities.length) {
    const city = options.cities[0]
    const filtered = await get('/deals?limit=100&location=' + encodeURIComponent(city))
    assert.ok(filtered.deals.every(item => ['city', 'country', 'address'].some(key => item.location?.[key]?.includes(city))))
  }
  if (all.deals.length > 1) {
    const first = await get('/deals?limit=1&page=1'), second = await get('/deals?limit=1&page=2')
    assert.notEqual(first.deals[0]._id, second.deals[0]._id)
  }
  const withDish = all.deals.find(item => item.dishes.length)
  if (withDish) {
    const dish = withDish.dishes[0]
    const result = await get('/deals?search=' + encodeURIComponent(dish.name))
    assert.ok(result.deals.some(item => item._id === withDish._id))
    const detail = await get('/deals/' + withDish._id)
    assert.equal(detail.deal.dishes.find(item => item._id === dish._id).rating, dish.rating)
  }
  const mapped = all.deals.find(item => Number.isFinite(item.location?.latitude) && Number.isFinite(item.location?.longitude))
  if (mapped) {
    const nearby = await get('/deals?latitude=' + mapped.location.latitude + '&longitude=' + mapped.location.longitude + '&radiusKm=0.1')
    assert.ok(nearby.deals.some(item => item._id === mapped._id))
    assert.ok(nearby.deals.every(item => item.distanceKm <= .1))
  }
  assert.equal((await fetch(base + '/deals?latitude=91&longitude=0')).status, 400)
  assert.equal((await fetch(base + '/saved')).status, 401)
  const upcoming = await get('/deals?availability=upcoming')
  assert.ok(upcoming.deals.every(item => new Date(item.opensAt) > new Date()))
  console.log('Live discovery checks passed; ' + all.deals.length + ' database restaurants checked. No database writes.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
