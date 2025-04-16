import { Schema, model } from 'mongoose'
import { ISubscription } from '../interfaces/Subscription.interface'

const SubscriptionSchema = new Schema<ISubscription>(
  {
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
)

export default model<ISubscription>('Subscription', SubscriptionSchema)
