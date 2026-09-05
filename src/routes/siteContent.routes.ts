import { Router } from 'express'

import asyncHandler from '../utils/asyncHandler'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'
import {
  getLegalContent,
  updateLegalContent,
} from '../controllers/SiteContent.controller'

const router = Router()

router.get('/content/legal', asyncHandler(getLegalContent))
router.put(
  '/content/legal',
  protect,
  authorizeRoles('admin'),
  asyncHandler(updateLegalContent),
)

export default router
