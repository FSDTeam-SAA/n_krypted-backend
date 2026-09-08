import cloudinary from './cloudinary'
import ImageCleanup from '../models/ImageCleanup.model'
import Deal from '../models/Deal.model'
import User from '../models/User.model'
import Category from '../models/Category.model'
import Blog from '../models/Blog.model'

export function ownedImagePublicId(value: string): string | null {
  try {
    const url = new URL(value)
    const cloud = cloudinary.config().cloud_name
    if (!cloud || url.hostname !== 'res.cloudinary.com' || !['https:', 'http:'].includes(url.protocol)) return null
    const prefix = `/${cloud}/image/upload/`
    if (!url.pathname.startsWith(prefix)) return null
    const path = url.pathname.slice(prefix.length)
    // Uploaded secure_urls have a version; do not guess IDs for arbitrary URLs.
    const match = path.match(/(?:^|\/)v\d+\/(.+)\.[a-zA-Z0-9]+$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch { return null }
}

export async function queueRemovedImages(before: string[], after: string[]) {
  const removed = [...new Set(before)].filter(url => !after.includes(url))
  for (const url of removed) {
    const publicId = ownedImagePublicId(url)
    if (publicId) await ImageCleanup.updateOne({ url }, { $setOnInsert: { url, publicId, nextAttemptAt: new Date() } }, { upsert: true })
  }
  return removed
}

export async function imageIsReferenced(publicId: string) {
  const variants = [...new Set([publicId, publicId.split('/').map(encodeURIComponent).join('/')])]
  const escaped = variants.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const image = new RegExp(`/(?:${escaped})\\.[a-zA-Z0-9]+(?:[?#].*)?$`)
  const references = await Promise.all([
    Deal.exists({ $or: [{ images: image }, { 'dishes.image': image }, { 'dishes.images': image }] }),
    User.exists({ avatar: image }), Category.exists({ image }), Blog.exists({ image }),
  ])
  return references.some(Boolean)
}

export async function processImageCleanup(urls?: string[]) {
  const jobs = await ImageCleanup.find(urls ? { url: { $in: urls } } : { nextAttemptAt: { $lte: new Date() } }).sort({ nextAttemptAt: 1 }).limit(25)
  for (const job of jobs) {
    try {
      if (ownedImagePublicId(job.url) !== job.publicId) continue
      // Never remove an asset still used by any restaurant/dish/profile/category/blog.
      if (await imageIsReferenced(job.publicId)) {
        await ImageCleanup.updateOne({ _id: job._id }, { $set: { nextAttemptAt: new Date(Date.now() + 3600_000) } })
        continue
      }
      const result = await cloudinary.uploader.destroy(job.publicId, { resource_type: 'image', invalidate: true })
      if (!['ok', 'not found'].includes(result.result)) throw new Error('Image deletion not acknowledged')
      await ImageCleanup.deleteOne({ _id: job._id })
    } catch {
      await ImageCleanup.updateOne({ _id: job._id }, { $inc: { attempts: 1 }, $set: { nextAttemptAt: new Date(Date.now() + 300_000) } })
    }
  }
}

export function startImageCleanupWorker() {
  let busy = false
  const timer = setInterval(async () => {
    if (busy) return
    busy = true
    try { await processImageCleanup() } catch { console.warn('Image cleanup will retry') } finally { busy = false }
  }, 60_000)
  timer.unref()
}
