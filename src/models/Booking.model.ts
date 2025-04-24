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
    isBooked: {
      type: Boolean,
      default: false,
    },
    notifyMe: {
        type: Boolean,
        default: false
    }
  },
  {
    timestamps: true,
  }
)

const Booking = mongoose.model<IBooking>('Booking', bookingSchema)
export default Booking
