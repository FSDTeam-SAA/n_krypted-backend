import express from 'express'
import {
  generateClientToken,
  paymentCheckOut,
} from '../controllers/payment.controller'

const router = express.Router()

// Generate client token for Braintree
router.get('/payments/client-token', generateClientToken)

// Process payment
router.post('/payments/checkout', paymentCheckOut)

export default router
