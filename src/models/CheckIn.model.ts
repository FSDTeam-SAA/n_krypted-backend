import { Schema, model } from 'mongoose'
import { ICheckIn } from '../interfaces/CheckIn.interface'

const CheckInSchema = new Schema<ICheckIn>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
      index: true,
    },
    checkedInAt: { type: Date, default: Date.now, required: true, index: true },
    partySize: { type: Number, required: true, min: 1, max: 50 },
    userLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number },
    },
    distanceMeters: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['verified'], default: 'verified' },
  },
  { timestamps: true }
)

CheckInSchema.index({ restaurantId: 1, checkedInAt: -1 })
CheckInSchema.index({ userId: 1, checkedInAt: -1 })

export default model<ICheckIn>('CheckIn', CheckInSchema)
