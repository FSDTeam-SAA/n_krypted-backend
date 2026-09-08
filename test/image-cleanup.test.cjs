const test = require('node:test')
const assert = require('node:assert/strict')
const cloudinary = require('../dist/src/utils/cloudinary').default
const Queue = require('../dist/src/models/ImageCleanup.model').default
const Deal = require('../dist/src/models/Deal.model').default
const User = require('../dist/src/models/User.model').default
const Category = require('../dist/src/models/Category.model').default
const Blog = require('../dist/src/models/Blog.model').default
const { ownedImagePublicId, queueRemovedImages, processImageCleanup } = require('../dist/src/utils/imageCleanup')
const { updateAdminRestaurant } = require('../dist/src/controllers/RestaurantManagement.controller')
const { createCheckIn } = require('../dist/src/controllers/CheckIn.controller')
const url = 'https://res.cloudinary.com/test-cloud/image/upload/v123/n-krypted/restaurants/photo.jpg'

function configure(t) {
  t.mock.method(cloudinary, 'config', () => ({ cloud_name: 'test-cloud' }))
}
test('cleanup resolves only versioned image assets in our Cloudinary account', t => {
  configure(t)
  assert.equal(ownedImagePublicId(url), 'n-krypted/restaurants/photo')
  for (const value of [url.replace('test-cloud', 'other-cloud'), url.replace('res.cloudinary.com', 'example.com'), url.replace('/image/', '/video/'), 'not a URL']) assert.equal(ownedImagePublicId(value), null)
})
test('queue contains only removed database images, not retained images', async t => {
  configure(t)
  const writes = []
  t.mock.method(Queue, 'updateOne', async (...args) => writes.push(args))
  await queueRemovedImages([url, url, 'https://example.com/external.jpg'], [])
  assert.equal(writes.length, 1)
  assert.equal(writes[0][0].url, url)
  await queueRemovedImages([url], [url])
  assert.equal(writes.length, 1)
})
for (const scenario of ['deleted', 'shared', 'failed']) {
  test(`Cloudinary cleanup: ${scenario}`, async t => {
    configure(t)
    const job = { _id: 'job', url, publicId: 'n-krypted/restaurants/photo' }
    t.mock.method(Queue, 'find', () => ({ sort: () => ({ limit: async () => [job] }) }))
    t.mock.method(Deal, 'exists', async () => scenario === 'shared' ? { _id: 'other-restaurant' } : null)
    for (const model of [User, Category, Blog]) t.mock.method(model, 'exists', async () => null)
    const destroyed = t.mock.method(cloudinary.uploader, 'destroy', async (id, options) => {
      assert.equal(id, job.publicId)
      assert.equal(options.invalidate, true)
      if (scenario === 'failed') throw new Error('Cloudinary offline')
      return { result: 'ok' }
    })
    const removed = t.mock.method(Queue, 'deleteOne', async () => ({}))
    const retried = t.mock.method(Queue, 'updateOne', async () => ({}))
    await processImageCleanup([url])
    assert.equal(destroyed.mock.callCount(), scenario === 'shared' ? 0 : 1)
    assert.equal(removed.mock.callCount(), scenario === 'deleted' ? 1 : 0)
    assert.equal(retried.mock.callCount(), scenario === 'deleted' ? 0 : 1)
  })
}
test('removing the last restaurant image queues cleanup and persists an empty image list', async t => {
  configure(t)
  const order = []
  const restaurant = { images: [url], save: async () => order.push('saved'), populate: async () => {} }
  t.mock.method(Deal, 'findById', async () => restaurant)
  t.mock.method(Queue, 'updateOne', async () => order.push('queued'))
  t.mock.method(Queue, 'find', () => ({ sort: () => ({ limit: async () => [] }) }))
  const res = { status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
  await updateAdminRestaurant({ params: { id: 'restaurant' }, user: { id: 'admin', role: 'admin' }, body: {
    title: 'Restaurant', description: 'Description', existingImages: '[]',
    location: { address: 'Street', city: 'Berlin', country: 'Germany', latitude: 52, longitude: 13 },
  } }, res)
  assert.equal(res.code, 200)
  assert.deepEqual(restaurant.images, [])
  assert.deepEqual(order, ['queued', 'saved'])
})
test('check-in rejects null coordinates instead of treating them as zero', async () => {
  const res = { status(code) { this.code = code; return this }, json(body) { this.body = body } }
  await createCheckIn({ body: { restaurantId: '507f1f77bcf86cd799439011', latitude: null, longitude: null, partySize: 1 } }, res)
  assert.equal(res.code, 400)
})
test('metadata-only edit preserves images and never queues their deletion', async t => {
  configure(t)
  const restaurant = { images: [url], save: async () => {}, populate: async () => {} }
  t.mock.method(Deal, 'findById', async () => restaurant)
  const queue = t.mock.method(Queue, 'updateOne', async () => ({}))
  t.mock.method(Queue, 'find', () => ({ sort: () => ({ limit: async () => [] }) }))
  const res = { status(code) { this.code = code; return this }, json() {} }
  await updateAdminRestaurant({ params: { id: 'restaurant' }, user: { id: 'admin', role: 'admin' }, body: {
    title: 'Updated name', description: 'Description',
    location: { address: 'Street', city: 'Berlin', country: 'Germany', latitude: 52, longitude: 13 },
  } }, res)
  assert.equal(res.code, 200)
  assert.deepEqual(restaurant.images, [url])
  assert.equal(queue.mock.callCount(), 0)
})
