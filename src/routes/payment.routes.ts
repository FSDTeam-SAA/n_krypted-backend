import express from 'express'
import {
  getClientToken,
  makePayment,
  getTotalRevenue,
  getTotalBookings,
  getTotalCustomers,
  getTotalDeals,
} from '../controllers/payment.controller'

const router = express.Router()

// Generate client token for Braintree
router.get('/payments/client-token', getClientToken)

// Process payment
router.post('/payments/checkout', makePayment)
// Analytics routes
router.get('/analytics/revenue', getTotalRevenue)
router.get('/analytics/bookings', getTotalBookings)
router.get('/analytics/customers', getTotalCustomers)
router.get('/analytics/deals', getTotalDeals)

export default router
