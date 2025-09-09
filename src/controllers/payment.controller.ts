import { Request, Response, NextFunction } from 'express'
import { PaymentInfo } from '../models/PaymentInfo.model'
import asyncHandler from '../utils/asyncHandler'
import Booking from '../models/Booking.model'
import User from '../models/User.model'
import Deal from '../models/Deal.model'
import { createOrder, captureOrder } from '../services/paypal.service'
import Stripe from 'stripe'
import { sendBookingConfirmationEmail } from '../utils/sendBookingConfirmationEmail'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-06-30.basil',
})

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

// paypal
// controllers/payment.controller.ts

export const createPaypalOrder = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body
    const order = await createOrder(amount)
    res.status(200).json({
      success: true,
      message: 'PayPal order created',
      orderId: order.id,
      links: order.links,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create PayPal order',
      error,
    })
  }
}

const mapPaypalStatusToEnum = (
  paypalStatus: string
): 'complete' | 'pending' | 'failed' => {
  switch (paypalStatus.toUpperCase()) {
    case 'COMPLETED':
      return 'complete'
    case 'PENDING':
      return 'pending'
    case 'FAILED':
    case 'DECLINED':
    case 'DENIED':
      return 'failed'
    default:
      return 'failed' // fallback for unexpected values
  }
}

// export const capturePaypalPayment = async (req: Request, res: Response) => {
//   try {
//     const { orderId, userId, bookingId, seasonId } = req.body
//     const capture = await captureOrder(orderId)

//     const captureDetails = capture.purchase_units[0].payments.captures[0]

//     const newPayment = await PaymentInfo.create({
//       userId,
//       bookingId,
//       price: captureDetails.amount.value,
//       paymentStatus: mapPaypalStatusToEnum(captureDetails.status),
//       transactionId: captureDetails.id,
//       paymentMethod: 'PayPal',
//       seasonId,
//     })

//     const user = await User.findById(newPayment.userId)
//     const booking = await Booking.findById(newPayment.bookingId)
//     const deal = await Deal.findById(booking?.dealsId)

//     if (!user || !booking || !deal) {
//       res.status(400).json({ message: 'User or Booking not found' })
//       return
//     }

//     if (newPayment.paymentStatus === 'complete') {
//       try {
//         // update the booking status
//         await Booking.findByIdAndUpdate(
//           booking._id,
//           { paymentStatus: 'complete', isBooked: true }, // optional: also mark isBooked
//           { new: true }
//         )

//         // send email notification
//         await sendBookingConfirmationEmail(user.email, booking, deal, user)
//       } catch (emailError) {
//         console.error('Failed to send booking confirmation email:', emailError)
//       }
//     }

//     res.status(200).json({
//       message: 'Payment captured successfully',
//       payment: newPayment,
//     })
//   } catch (error) {
//     res.status(500).json({ message: 'Payment capture failed', error })
//   }
// }

export const capturePaypalPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, userId, bookingId } = req.body
    const capture = await captureOrder(orderId)

    const captureDetails = capture.purchase_units[0].payments.captures[0]

    const newPayment = await PaymentInfo.create({
      userId,
      bookingId,
      price: captureDetails.amount.value,
      paymentStatus: mapPaypalStatusToEnum(captureDetails.status),
      transactionId: captureDetails.id,
      paymentMethod: 'PayPal',
    })

    const user = await User.findById(newPayment.userId)
    const booking = await Booking.findById(newPayment.bookingId)
    const deal = await Deal.findById(booking?.dealsId)

    if (!user || !booking || !deal) {
      res.status(400).json({ message: 'User or Booking not found' })
      return
    }

    if (newPayment.paymentStatus === 'complete') {
      try {
        // update the booking status
        await Booking.findByIdAndUpdate(
          booking._id,
          { paymentStatus: 'complete', isBooked: true }, // optional: also mark isBooked
          { new: true }
        )

        // Update the bookedCount in the deal's schedule date after payment success
        const scheduleDates = deal.scheduleDates.map((schedule: any) =>
          schedule.date.toISOString() ===
          new Date(booking.scheduleDate).toISOString()
            ? {
                ...schedule,
                bookedCount:
                  (schedule.bookedCount ?? 0) + (booking.quantity ?? 1),
              }
            : schedule
        )

        // Save the updated scheduleDates back to the deal
        deal.scheduleDates = scheduleDates
        await deal.save()

        // send email notification
        await sendBookingConfirmationEmail(user.email, booking, deal, user)
      } catch (emailError) {
        console.error('Failed to send booking confirmation email:', emailError)
      }
    }

    res.status(200).json({
      message: 'Payment captured successfully',
      payment: newPayment,
    })
  } catch (error) {
    res.status(500).json({ message: 'Payment capture failed', error })
  }
}

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

// stripe create payment
export const createPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, price, bookingId } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price * 100,
      currency: 'eur',
      payment_method_types: ['card'],
      metadata: {
        userId,
        bookingId,
      },
    })

    const paymentInfo = await PaymentInfo.create({
      userId,
      bookingId,
      price,
      paymentStatus: 'pending',
      paymentMethod: 'Stripe',
      transactionId: paymentIntent.id,
    })

    await paymentInfo.save()

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    })
  }
)

// stripe confirm payment
// export const confirmPayment = asyncHandler(
//   async (req: Request, res: Response) => {
//     const { paymentIntentId } = req.body

//     if (!paymentIntentId) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Payment intent ID is required' })
//     }

//     const paymentIntint = await stripe.paymentIntents.retrieve(paymentIntentId)

//     if (paymentIntint.status === 'succeeded') {
//       await PaymentInfo.updateOne(
//         { transactionId: paymentIntentId },
//         { paymentStatus: 'complete' }
//       )

//       // get the updated document
//       const payment = await PaymentInfo.findOne({
//         transactionId: paymentIntentId,
//       })

//       if (!payment) {
//         return res.status(400).json({ message: 'Payment not found' })
//       }

//       const user = await User.findById(payment.userId)
//       const booking = await Booking.findById(payment.bookingId)

//       if (!user || !booking) {
//         return res.status(400).json({ message: 'User or Booking not found' })
//       }

//       const deal = await Deal.findById(booking.dealsId)

//       if (payment.paymentStatus === 'complete') {
//         try {
//           await sendBookingConfirmationEmail(user.email, booking, deal, user)
//         } catch (error) {
//           console.error('Failed to send booking confirmation email:', error)
//         }
//       }

//       await Booking.updateOne(
//         { _id: paymentIntint.metadata.bookingId },
//         { isBooked: true, paymentStatus: 'complete' }
//       )

//       return res
//         .status(200)
//         .json({ success: true, message: 'Payment completed' })
//     } else {
//       await PaymentInfo.updateOne(
//         { transactionId: paymentIntentId },
//         { paymentStatus: 'failed' }
//       )

//       await Booking.updateOne(
//         { _id: paymentIntint.metadata.bookingId },
//         { isBooked: false }
//       )

//       return res.status(400).json({ success: false, message: 'Payment failed' })
//     }
//   }
// )

export const confirmPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { paymentIntentId } = req.body

    if (!paymentIntentId) {
      return res
        .status(400)
        .json({ success: false, message: 'Payment intent ID is required' })
    }

    const paymentIntint = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntint.status === 'succeeded') {
      await PaymentInfo.updateOne(
        { transactionId: paymentIntentId },
        { paymentStatus: 'complete' }
      )

      // get the updated document
      const payment = await PaymentInfo.findOne({
        transactionId: paymentIntentId,
      })

      if (!payment) {
        return res.status(400).json({ message: 'Payment not found' })
      }

      const user = await User.findById(payment.userId)
      const booking = await Booking.findById(payment.bookingId)

      if (!user || !booking) {
        return res.status(400).json({ message: 'User or Booking not found' })
      }

      const deal = await Deal.findById(booking.dealsId)

      if (payment.paymentStatus === 'complete') {
        try {
          await sendBookingConfirmationEmail(user.email, booking, deal, user)
        } catch (error) {
          console.error('Failed to send booking confirmation email:', error)
        }
      }
      //-------------------------------------------------------

      // Update bookedCount only after payment is complete
      const scheduleDates = (deal?.scheduleDates ?? []).map((s: any) =>
        s.date.toISOString() === new Date(booking.scheduleDate).toISOString()
          ? {
              ...s,
              bookedCount: (s.bookedCount ?? 0) + (booking.quantity ?? 1),
            }
          : s
      )

      // Save the updated scheduleDates back to the deal
      if (deal) {
        deal.scheduleDates = scheduleDates
        await deal.save()
      }

      // --------------------------

      await Booking.updateOne(
        { _id: paymentIntint.metadata.bookingId },
        { isBooked: true, paymentStatus: 'complete' }
      )

      return res
        .status(200)
        .json({ success: true, message: 'Payment completed' })
    } else {
      await PaymentInfo.updateOne(
        { transactionId: paymentIntentId },
        { paymentStatus: 'failed' }
      )

      await Booking.updateOne(
        { _id: paymentIntint.metadata.bookingId },
        { isBooked: false }
      )

      return res.status(400).json({ success: false, message: 'Payment failed' })
    }
  }
)
