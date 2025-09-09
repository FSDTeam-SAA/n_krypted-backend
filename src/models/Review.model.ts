import { Schema, model, Types } from 'mongoose'
import { IReview } from '../interfaces/Review.interface'

const ReviewSchema = new Schema<IReview>(
  {
    userID: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dealID: { type: Schema.Types.ObjectId, ref: 'Deal', required: true },
    reviewComment: { type: String, required: true },
    ratings: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
)

export default model<IReview>('Review', ReviewSchema)
