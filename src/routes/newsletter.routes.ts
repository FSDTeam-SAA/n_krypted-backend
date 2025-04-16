import express from 'express'
import {
  subscribe,
  unsubscribe,
  listSubscribers,
  sendNewsletter,
} from '../controllers/Newsletter.controller'

const router = express.Router()

// Subscribe to newsletter
router.post('/subscribe', subscribe)

// Unsubscribe from newsletter
router.post('/unsubscribe', unsubscribe)

// List all subscribers (admin only)
router.get('/subscribers', listSubscribers)

// Send newsletter to all subscribers
router.post('/send', sendNewsletter)

export default router
