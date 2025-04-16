import express from 'express'
import asyncHandler from '../utils/asyncHandler'
import {
  createReview,
  getReviewsByDeal,
  updateReview,
  deleteReview,
} from '../controllers/Review.controller'
import protect from '../middlewares/auth.middleware'

const router = express.Router()

// Create a review
router.post('/', protect, asyncHandler(createReview))
// Get all reviews for a deal
router.get('/deal/:dealID', asyncHandler(getReviewsByDeal))
// Update a review
router.put('/:id', protect, asyncHandler(updateReview))
// Delete a review
router.delete('/:id', protect, asyncHandler(deleteReview))

export default router
