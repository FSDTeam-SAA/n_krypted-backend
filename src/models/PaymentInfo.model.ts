import mongoose from 'mongoose'
import { IPaymentInfo } from '../interfaces/Payment.interface'

const paymentInfoSchema = new mongoose.Schema<IPaymentInfo>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    price: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['complete', 'pending', 'failed'],
      default: 'pending',
    },
    seasonId: { type: String },
    transactionId: { type: String },
    paymentMethodNonce: { type: String },
    paymentMethod: { type: String },
  },
  {
    timestamps: true,
  }
)

export const PaymentInfo = mongoose.model<IPaymentInfo>(
  'PaymentInfo',
  paymentInfoSchema
)
