import { Router } from 'express'
import * as bookingController from '../controllers/Booking.controller'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'

const router = Router()

// Create a new booking
router.post('/bookings', protect, bookingController.createBooking)

// Get all bookings
router.get(
  '/bookings',
  protect,
  authorizeRoles('admin'),
  bookingController.getAllBookings
)

// Get all booked bookings notifyMe
router.get('/bookings/booked', protect, bookingController.getBookedBookings)

// Get bookings by userId where notifyMe is false
router.get(
  '/bookings/notify-false',
  protect,
  bookingController.getBookingsNotifyFalse
)

// Get bookings by userId where notifyMe is true
router.get('/bookings/notify-true', protect, bookingController.getBookingsNotifyTrue)

// Get single booking
router.get('/bookings/:id', bookingController.getSingleBooking)

// Update booking
router.put('/bookings/:id', bookingController.updateBooking)

// Delete booking
router.delete('/bookings/:id', protect, bookingController.deleteBooking)

export default router
