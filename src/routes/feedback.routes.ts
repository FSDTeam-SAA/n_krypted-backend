import { Router } from 'express'
import * as feedbackController from '../controllers/Feedback.controller'

const router = Router()

// Create feedback
router.post('/feedback', feedbackController.createFeedback)

// Get all feedbacks
router.get('/feedback', feedbackController.getAllFeedbacks)

// Delete feedback
router.delete('/feedback/:id', feedbackController.deleteFeedback)

export default router
