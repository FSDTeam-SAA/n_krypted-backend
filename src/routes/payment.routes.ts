import express from 'express'
import {
  generateClientToken,
  paymentCheckOut,
  getTotalRevenue,
  getTotalBookings,
  getTotalCustomers,
  getTotalDeals,
} from '../controllers/payment.controller'

const router = express.Router()

// Generate client token for Braintree
router.get('/payments/client-token', generateClientToken)

// Process payment
router.post('/payments/checkout', paymentCheckOut)

// Analytics routes
router.get('/analytics/revenue', getTotalRevenue)
router.get('/analytics/bookings', getTotalBookings)
router.get('/analytics/customers', getTotalCustomers)
router.get('/analytics/deals', getTotalDeals)

export default router
