import { Request, Response } from 'express'
import Booking from '../models/Booking.model'
import mongoose from 'mongoose'
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
    const userId = req.user?.id
    const bookings = await Booking.find({ userId, notifyMe: false })
      .populate('dealsId')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, bookings })
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
    const userId = req.user?.id
    const bookings = await Booking.find({ userId, notifyMe: true })
      .populate('dealsId')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, bookings })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
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
    const booking = await Booking.findById(id).populate('dealsId')

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' })
      return
    }

    // Check if the booking belongs to the logged-in user
    if (booking.userId.toString() !== req.user?.id) {
      res
        .status(403)
        .json({
          success: false,
          message: 'Not authorized to view this booking',
        })
      return
    }

    res.status(200).json({ success: true, booking })
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

    // Check if the booking belongs to the logged-in user
    if (booking.userId.toString() !== req.user?.id) {
      res
        .status(403)
        .json({
          success: false,
          message: 'Not authorized to update this booking',
        })
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

    // Check if the booking belongs to the logged-in user
    if (booking.userId.toString() !== req.user?.id) {
      res
        .status(403)
        .json({
          success: false,
          message: 'Not authorized to delete this booking',
        })
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
