import { Schema, model } from 'mongoose'
import { IFeedback } from '../interfaces/Feedback.interface'

const FeedbackSchema = new Schema<IFeedback>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String },
    subject: { type: String },
    message: { type: String, required: true },
    isApproved: { type: Boolean, default: false }, 
  },
  { timestamps: true }
)
export default model<IFeedback>('Feedback', FeedbackSchema)
