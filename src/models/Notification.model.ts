import { Schema, model } from 'mongoose'
import { INotification } from '../interfaces/Notification.interface'

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['deal_status_change', 'new_deal'],
      required: true 
    },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal' },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export default model<INotification>('Notification', NotificationSchema) 