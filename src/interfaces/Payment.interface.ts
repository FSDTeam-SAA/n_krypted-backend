import { Types } from 'mongoose'

export interface IPaymentInfo {
  userId: Types.ObjectId
  bookingId: Types.ObjectId
  price: Number
  paymentStatus: 'complete' | 'padding' | 'failed'
  seasonId: string
}
