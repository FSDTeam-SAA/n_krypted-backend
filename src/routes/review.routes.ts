import express from 'express'
import asyncHandler from '../utils/asyncHandler'
import {
  createReview,
  getReviewsByDeal,
  getReviewEligibility,
  updateReview,
  deleteReview,
  bulkDeleteReviews,
  getDashboardStats,
  getCategoryCheckInStats,
  getAllReviews,
  getReviewRestaurantSummaries,
} from '../controllers/Review.controller'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'

const router = express.Router()

// Create a review
router.post('/reviews', protect, asyncHandler(createReview))

// Get all reviews
router.get('/reviews', protect, authorizeRoles('admin', 'restaurant_owner'), asyncHandler(getAllReviews))
router.get(
  '/review-restaurants',
  protect,
  authorizeRoles('admin', 'restaurant_owner'),
  asyncHandler(getReviewRestaurantSummaries)
)

router.get('/reviews/eligibility/:dealID', protect, authorizeRoles('user'), asyncHandler(getReviewEligibility))

// Get all reviews for a deal
router.get('/reviews/deal/:dealID', asyncHandler(getReviewsByDeal))
// Update a review
router.put('/reviews/:id', protect, asyncHandler(updateReview))
// Delete a review
router.delete(
  '/reviews/bulk',
  protect,
  authorizeRoles('admin'),
  asyncHandler(bulkDeleteReviews)
)
router.delete('/reviews/:id', protect, asyncHandler(deleteReview))

// Get dashboard stats
router.get('/dashboard/stats', protect, authorizeRoles('admin', 'restaurant_owner'), asyncHandler(getDashboardStats))

// top bookings for pie chart
router.get('/check-in-stats', protect, authorizeRoles('admin'), asyncHandler(getCategoryCheckInStats))

export default router
