import { Request, Response } from 'express'
import Booking from '../models/Booking.model'
import crypto from 'crypto'
import Deal  from '../models/Deal.model'
import { PaymentInfo } from '../models/PaymentInfo.model'
import { MetaPagination } from './Deal.controller'


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

    const deal = await Deal.findById(dealsId)
    if (!deal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
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

    // Get all booking _ids for the deal
    const allBookings = await Booking.find({ dealsId }).select('_id')
    const bookingIds = allBookings.map((b) => b._id)

    // Count completed payments after the deal's updated time
    const completedPaymentCount = await PaymentInfo.countDocuments({
      bookingId: { $in: bookingIds },
      paymentStatus: 'complete',
      createdAt: { $gt: deal.updatedAt },
    })

    // Check and update deal status
    if (
      deal.participationsLimit &&
      completedPaymentCount >= deal.participationsLimit
    ) {
      deal.status = 'deactivate'
      await deal.save()
    }

    res.status(201).json({
      success: true,
      booking,
      dealStatus: deal.status,
      completedPaymentCount,
      participationsLimit: deal.participationsLimit,
    })
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
    const userId = req.query.user as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    if (!userId || typeof userId !== 'string') {
      res
        .status(400)
        .json({ success: false, message: 'Invalid or missing user ID' })
      return
    }

    const skip = (page - 1) * limit

    const [totalItems, bookings] = await Promise.all([
      Booking.countDocuments({ userId, notifyMe: true }),
      Booking.find({ userId, notifyMe: true })
        .populate('dealsId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ])

    const totalPages = Math.ceil(totalItems / limit)

    const pagination: MetaPagination = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    }

    res.status(200).json({
      success: true,
      data: bookings,
      pagination,
    })
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
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const [totalItems, bookings] = await Promise.all([
      Booking.countDocuments(),
      Booking.find()
        .populate('dealsId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ])

    const totalPages = Math.ceil(totalItems / limit)

    const pagination: MetaPagination = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    }

    res.status(200).json({
      success: true,
      data: bookings,
      pagination,
    })
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
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const filter = { notifyMe: true }

    const [bookings, totalItems] = await Promise.all([
      Booking.find(filter)
        .populate('dealsId')
        .populate('userId', 'name email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ])

    const totalPages = Math.ceil(totalItems / limit)

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booked bookings',
      error: error.message,
    })
  }
}