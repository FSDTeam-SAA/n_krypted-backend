import mongoose, { Schema, model } from 'mongoose'
import { IDeal } from '../interfaces/Deal.interface'

const DealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    participations: { type: Number, default: 0 },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    images: [{ type: String }],
    offers: [{ type: String }],
    status: { type: String, enum: ['activate', 'deactivate'] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  },
  { timestamps: true }
)

export default model<IDeal>('Deal', DealSchema)
