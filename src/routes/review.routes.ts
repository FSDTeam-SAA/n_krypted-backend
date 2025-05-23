import express from 'express'
import asyncHandler from '../utils/asyncHandler'
import {
  createReview,
  getReviewsByDeal,
  updateReview,
  deleteReview,
  getDashboardStats,
  getCategoryBookingStats,
  getRevenueAndBookingStats,
} from '../controllers/Review.controller'
import protect from '../middlewares/auth.middleware'

const router = express.Router()

// Create a review
router.post('/reviews', protect, asyncHandler(createReview))
// Get all reviews for a deal
router.get('/reviews/deal/:dealID', asyncHandler(getReviewsByDeal))
// Update a review
router.put('/reviews/:id', protect, asyncHandler(updateReview))
// Delete a review
router.delete('/reviews/:id', protect, asyncHandler(deleteReview))

// Get dashboard stats
router.get('/dashboard/stats', getDashboardStats)

// top bookings for pie chart 
router.get('/booking-stats', getCategoryBookingStats)

router.get('/revenue-booking', getRevenueAndBookingStats)


export default router
