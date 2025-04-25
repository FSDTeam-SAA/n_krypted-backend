import { Request, Response, NextFunction } from 'express'
import { gateway } from '../config/paypalBraintree'
import { PaymentInfo } from '../models/PaymentInfo.model'
import asyncHandler from '../utils/asyncHandler'

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
      const { amount, paymentMethodNonce, deviceData, bookingId, seasonId } =
        req.body
      const userId = req.user?.id

      // Validate request body
      if (!amount || !paymentMethodNonce || !bookingId) {
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
