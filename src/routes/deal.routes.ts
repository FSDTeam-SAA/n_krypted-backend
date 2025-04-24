import { Router } from 'express'
import * as dealController from '../controllers/Deal.controller'
import upload from '../middlewares/multer.middleware'
import protect from '../middlewares/auth.middleware'

const router = Router()

// Create a new deal
router.post(
  '/deals',
  protect,
  upload.array('images'),
  dealController.createDeal
)

// Get all deals
router.get('/deals', dealController.getAllDeals)

// Get single deal
router.get('/deals/:id', dealController.getSingleDeal)

// Update a deal
router.put(
  '/deals/:id',
  protect,
  upload.array('images'),
  dealController.updateDeal
)

// Delete a deal
router.delete('/deals/:id', protect, dealController.deleteDeal)

// Change deal status
router.patch('/deals/:id/status', protect, dealController.changeDealStatus)

export default router
