import { Request, Response, NextFunction } from 'express'
import { gateway } from '../config/paypalBraintree'
import { PaymentInfo } from '../models/PaymentInfo.model'
import asyncHandler from '../utils/asyncHandler'
import Booking from '../models/Booking.model'
import User from '../models/User.model'
import Deal from '../models/Deal.model'

import {
  generateClientToken,
  processTransaction,
} from '../services/braintree.service'

// JSON validation middleware
const validateJsonBody = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload',
      details: err.message,
    })
  }
  next()
}


// getClientToken client token
export const getClientToken = async (_req: Request, res: Response) => {
  try {
    const { clientToken } = await generateClientToken()
    res.status(200).json({ clientToken })
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate token', error: err })
  }
}

// processTransaction
export const makePayment = async (req: Request, res: Response) => {
  try {
    const { amount, paymentMethodNonce, userId, bookingId, seasonId } = req.body

    const result = await processTransaction(amount, paymentMethodNonce)

    if (result.success) {
      const newPayment = await PaymentInfo.create({
        userId,
        bookingId,
        seasonId,
        price: amount,
        paymentStatus: 'complete',
        transactionId: result.transaction.id,
        paymentMethodNonce,
        paymentMethod: result.transaction.paymentInstrumentType,
      })

       res.status(200).json({
        message: 'Payment successful',
        transactionId: result.transaction.id,
        payment: newPayment,
      })
      return
    } else {
       res.status(400).json({
        message: 'Payment failed',
        error: result.message
      })
    }
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error', error: err })
  }
}














// Get total revenue
export const getTotalRevenue = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payments = await PaymentInfo.find({ paymentStatus: 'complete' })
      const totalRevenue = payments.reduce(
        (acc, payment) => acc + payment.price,
        0
      )

      res.status(200).json({
        success: true,
        totalRevenue,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error fetching total revenue',
      })
    }
  }
)

// Get total bookings count
export const getTotalBookings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const totalBookings = await Booking.countDocuments({ isBooked: true })

      res.status(200).json({
        success: true,
        totalBookings,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error fetching total bookings',
      })
    }
  }
)

// Get total customers count
export const getTotalCustomers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const totalCustomers = await User.countDocuments()

      res.status(200).json({
        success: true,
        totalCustomers,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error fetching total customers',
      })
    }
  }
)

// Get total deals count
export const getTotalDeals = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const totalDeals = await Deal.countDocuments()

      res.status(200).json({
        success: true,
        totalDeals,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error fetching total deals',
      })
    }
  }
)
