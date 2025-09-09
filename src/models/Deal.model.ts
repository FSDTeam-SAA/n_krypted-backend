import mongoose, { Schema, model } from 'mongoose'
import { IDeal } from '../interfaces/Deal.interface'

const DealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    participationsLimit: { type: Number, default: 0 },
    price: { type: Number, required: true },
    location: {
      country: { type: String },
      city: { type: String },
    },
    images: [{ type: String }],
    offers: [{ type: String }],
    status: { type: String, enum: ['activate', 'deactivate'] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    time: { type: Number },
    timer: { type: String, enum: ['on', 'off'], default: 'off' },
    scheduleDates: [
      {
        date: { type: Date, required: true },
        active: { type: Boolean, default: true },
        participationsLimit: { type: Number, default: 0 },
        bookedCount: { type: Number, default: 0 }, // Track bookings per date
      },
    ],
  },
  { timestamps: true }
)

export default model<IDeal>('Deal', DealSchema)
