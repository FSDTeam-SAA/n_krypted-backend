import express from 'express'
import {
  subscribe,
  unsubscribe,
  listSubscribers,
  sendNewsletter,
} from '../controllers/Newsletter.controller'

const router = express.Router()

// Subscribe to newsletter
router.post('/newsletter/subscribe', subscribe)

// Unsubscribe from newsletter
router.post('/newsletter/unsubscribe', unsubscribe)

// List all subscribers (admin only)
router.get('/newsletter/subscribers', listSubscribers)

// Send newsletter to all subscribers
router.post('/newsletter/send', sendNewsletter)

export default router
