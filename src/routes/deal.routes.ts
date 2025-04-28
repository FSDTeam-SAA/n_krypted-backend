import { Router } from 'express'
import * as dealController from '../controllers/Deal.controller'
import upload from '../middlewares/multer.middleware'
import protect from '../middlewares/auth.middleware'

const router = Router()

// Create a new deal
router.post(
  '/deals',
  
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
  upload.array('images'),
  dealController.updateDeal
)

// Delete a deal
router.delete('/deals/:id',  dealController.deleteDeal)

// Change deal status
router.put('/deals/:id/status',  dealController.changeDealStatus)

export default router
