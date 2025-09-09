import mongoose, { Schema } from 'mongoose'
import { IBooking } from '../interfaces/Booking.interface'

const bookingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    dealsId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
    },
    price: {
      type: Number,
    },
    isBooked: {
      type: Boolean,
      default: false, 
    },
    notifyMe: {
      type: Boolean,
      default: false,
    },
    scheduleDate: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ['complete', 'pending', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

const Booking = mongoose.model<IBooking>('Booking', bookingSchema)
export default Booking
