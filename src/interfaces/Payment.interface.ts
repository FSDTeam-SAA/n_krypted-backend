import { Types } from 'mongoose'

export interface IPaymentInfo {
  userId: Types.ObjectId
  bookingId: Types.ObjectId
  price: number
  paymentStatus: 'complete' | 'pending' | 'failed'
  seasonId?: string
  transactionId?: string
  paymentMethodNonce?: string
  paymentMethod?: string
  createdAt: Date
  updatedAt: Date
}
