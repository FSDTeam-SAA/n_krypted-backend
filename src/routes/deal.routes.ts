import { Router } from 'express'
import * as dealController from '../controllers/Deal.controller'
import upload from '../middlewares/multer.middleware'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'

const router = Router()

// Create a new deal
router.post(
  '/deals',
  protect,
  authorizeRoles('admin'),
  upload.array('images'),
  dealController.createDeal
)

// Get all deals
router.get(
  '/deals',
  dealController.getAllDeals
)
router.get("/deals/popular", dealController.getPopularDeals);

// Get single deal
router.get('/deals/:id', dealController.getSingleDeal)

// Update a deal
router.patch(
  '/deals/:id',
  protect,
  authorizeRoles('admin'),
  upload.array('images'),
  dealController.updateDeal
)

// Delete a deal
router.delete(
  '/deals/bulk',
  protect,
  authorizeRoles('admin'),
  dealController.bulkDeleteDeals
)

router.delete(
  '/deals/:id',
  protect,
  authorizeRoles('admin'),
  dealController.deleteDeal
)

// Change deal status
router.patch(
  '/deals/:id/status',
  protect,
  authorizeRoles('admin'),
  dealController.changeDealStatus
)

// timer toggle
router.patch(
  '/deals/:id/timer',
  protect,
  authorizeRoles('admin'),
  dealController.toggleTimer
)
// popular deals toggle
router.patch(
  '/deals/:id/popular',
  protect,
  authorizeRoles('admin'),
  dealController.togglePopularDeals
)




export default router
