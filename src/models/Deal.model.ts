import mongoose, { Schema, model } from 'mongoose'
import { IDeal } from '../interfaces/Deal.interface'

const DealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
     shortDescription: { type: String, required: true },
    participationsLimit: { type: Number, default: 0 },
    price: { type: Number, required: true },
    location: {
      country: { type: String },
      city: { type: String },
      address: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dishes: [
      {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true, min: 0 },
        image: { type: String },
        images: [{ type: String }],
        category: { type: String },
        specialtyDescription: { type: String },
        ingredients: [{ type: String }],
        preparationProcess: { type: String },
        isSignatureDish: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
      },
    ],
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
    popularDeals: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default model<IDeal>('Deal', DealSchema)
