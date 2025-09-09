import { Document } from 'mongoose'

export interface IBooking extends Document {
  userId: string
  bookingId: string
  dealsId: string
  isBooked: boolean
  notifyMe: boolean
  scheduleDate: Date
  quantity: number
  paymentStatus: 'complete' | 'pending' | 'failed'
}
