import mongoose from 'mongoose'
import { IPaymentInfo } from '../interfaces/Payment.interface'

const paymentInfoSchema = new mongoose.Schema<IPaymentInfo>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  price: { type: Number, require: true },
  paymentStatus: {
    enum: ['complete', 'padding', 'failed'],
    default: 'padding',
  },
  seasonId: { type: String },
})

export const paymentInfo = mongoose.model('paymentInfo', paymentInfoSchema)
