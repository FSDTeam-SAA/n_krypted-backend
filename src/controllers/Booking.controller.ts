import { Request, Response } from 'express'
import Booking from '../models/Booking.model'
import crypto from 'crypto'

// Create a booking
export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { dealsId, notifyMe, userId } = req.body

    if (!dealsId) {
      res.status(400).json({ success: false, message: 'Deal ID is required' })
      return
    }

    const bookingId = crypto.randomBytes(5).toString('hex').toUpperCase()

    const booking = await Booking.create({
      userId,
      bookingId,
      dealsId,
      notifyMe: notifyMe || false,
      isBooked: true,
    })

    res.status(201).json({ success: true, booking })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message,
    })
  }
}

// Get all bookings by userId where notifyMe is false
export const getBookingsNotifyFalse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.query.user
    console.log('userID__', userId)
    const bookings = await Booking.find({ userId, notifyMe: false })
      .populate('dealsId')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, data: bookings })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    })
  }
}

// Get all bookings by userId where notifyMe is true
export const getBookingsNotifyTrue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.query.user
    console.log('userId__', userId)
    const bookings = await Booking.find({ userId, notifyMe: true })
      .populate('dealsId')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, data: bookings })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    })
  }
}

// Get all bookings
export const getAllBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bookings = await Booking.find()
      .populate('dealsId')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, data: bookings })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all bookings',
      error: error.message,
    })
  }
}

// Get single booking
export const getSingleBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    console.log('first', id)
    const booking = await Booking.findById(id).populate('dealsId')

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' })
      return
    }

    res.status(200).json({ success: true, data: booking })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message,
    })
  }
}

// Update booking
export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const updates = req.body

    const booking = await Booking.findById(id)

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' })
      return
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { ...updates },
      { new: true }
    ).populate('dealsId')

    res.status(200).json({ success: true, booking: updatedBooking })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: error.message,
    })
  }
}

// Delete booking
export const deleteBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const booking = await Booking.findById(id)

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' })
      return
    }

    await booking.deleteOne()
    res
      .status(200)
      .json({ success: true, message: 'Booking deleted successfully' })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking',
      error: error.message,
    })
  }
}

// Get all booked bookings (notifyMe: true)
export const getBookedBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bookings = await Booking.find({ notifyMe: true })
      .populate('dealsId')
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 })

    res.status(200).json({ 
      success: true, 
      count: bookings.length,
      data: bookings 
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booked bookings',
      error: error.message,
    })
  }
}
