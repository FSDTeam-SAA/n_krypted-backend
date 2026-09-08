import { Router } from 'express'

import asyncHandler from '../utils/asyncHandler'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'
import AppSettings from '../models/AppSettings.model'
import {
  getLegalContent,
  updateLegalContent,
} from '../controllers/SiteContent.controller'

const router = Router()

router.get('/content/app-settings', async (_req, res) => {
  const settings = await AppSettings.findOne({ key: 'public' }).lean()
  res.json({ success: true, settings: { instagramUrl: settings?.instagramUrl ?? '', tiktokUrl: settings?.tiktokUrl ?? '' } })
})
router.put('/content/app-settings', protect, authorizeRoles('admin'), async (req, res) => {
  const update: Record<string, string> = {}
  for (const key of ['instagramUrl', 'tiktokUrl']) {
    if (req.body?.[key] === undefined) continue
    const value = String(req.body[key]).trim()
    if (value) {
      try {
        const url = new URL(value)
        if (url.protocol !== 'https:') throw new Error('HTTPS required')
      } catch { res.status(400).json({ success: false, message: 'A valid HTTPS URL is required' }); return }
    }
    update[key] = value
  }
  const settings = await AppSettings.findOneAndUpdate({ key: 'public' }, { $set: update }, { new: true, upsert: true, runValidators: true })
  res.json({ success: true, settings })
})

router.get('/content/legal', asyncHandler(getLegalContent))
router.put(
  '/content/legal',
  protect,
  authorizeRoles('admin'),
  asyncHandler(updateLegalContent),
)

export default router
