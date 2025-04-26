import { Request, Response, NextFunction } from 'express'
import { gateway } from '../config/paypalBraintree'
import { PaymentInfo } from '../models/PaymentInfo.model'
import asyncHandler from '../utils/asyncHandler'
import Booking from '../models/Booking.model'
import User from '../models/User.model'
import Deal from '../models/Deal.model'

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

export const generateClientToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const response = await gateway.clientToken.generate({})
    res.status(200).json({
      success: true,
      clientToken: response.clientToken,
    })
  }
)

export const paymentCheckOut = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        amount,
        paymentMethodNonce,
        deviceData,
        bookingId,
        seasonId,
        userId,
      } = req.body

      // Validate request body
      if (!amount || !paymentMethodNonce || !bookingId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Amount, payment method nonce, and booking ID are required',
        })
        return
      }

      // Validate amount is a valid number
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount value',
        })
        return
      }

      // Create payment record with pending status
      const paymentInfo = await PaymentInfo.create({
        userId,
        bookingId,
        price: amount,
        paymentStatus: 'pending',
        seasonId,
        paymentMethodNonce,
      })

      try {
        const result = await gateway.transaction.sale({
          amount: amount.toString(), // Ensure amount is string
          paymentMethodNonce: paymentMethodNonce,
          deviceData: deviceData,
          options: {
            submitForSettlement: true,
          },
        })

        if (result.success) {
          // Update payment record with success status and transaction details
          await PaymentInfo.findByIdAndUpdate(paymentInfo._id, {
            paymentStatus: 'complete',
            transactionId: result.transaction.id,
            paymentMethod: result.transaction.paymentInstrumentType,
          })

          res.status(200).json({
            success: true,
            transaction: result.transaction,
            payment: await PaymentInfo.findById(paymentInfo._id),
          })
        } else {
          // Update payment record with failed status
          await PaymentInfo.findByIdAndUpdate(paymentInfo._id, {
            paymentStatus: 'failed',
          })

          res.status(400).json({
            success: false,
            error: result.message,
          })
        }
      } catch (error) {
        // Update payment record with failed status
        await PaymentInfo.findByIdAndUpdate(paymentInfo._id, {
          paymentStatus: 'failed',
        })

        res.status(500).json({
          success: false,
          error: 'Error processing payment',
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }
)

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
