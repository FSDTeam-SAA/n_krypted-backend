import { Router } from 'express'
import * as bookingController from '../controllers/Booking.controller'
import protect from '../middlewares/auth.middleware'

const router = Router()

// Create a new booking
router.post('/bookings', bookingController.createBooking)

// Get bookings by userId where notifyMe is false
router.get(
  '/bookings/notify-false',
  bookingController.getBookingsNotifyFalse
)

// Get bookings by userId where notifyMe is true
router.get(
  '/bookings/notify-true',
  bookingController.getBookingsNotifyTrue
)

// Get single booking
router.get('/bookings/:id', bookingController.getSingleBooking)

// Update booking
router.put('/bookings/:id', bookingController.updateBooking)

// Delete booking
router.delete('/bookings/:id', bookingController.deleteBooking)

export default router
