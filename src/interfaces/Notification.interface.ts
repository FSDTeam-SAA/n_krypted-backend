import { Types } from 'mongoose'

export interface INotification {
  userId: Types.ObjectId
  message: string
  type: 'deal_status_change' | 'new_deal'
  dealId?: Types.ObjectId
  isRead: boolean
  createdAt: Date
  updatedAt: Date
} 