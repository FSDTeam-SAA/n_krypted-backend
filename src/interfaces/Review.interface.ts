import { Types } from 'mongoose'

export interface IReview {
  userID: Types.ObjectId
  dealID: Types.ObjectId
  checkInID: Types.ObjectId
  dishID?: Types.ObjectId
  dishName?: string
  reviewComment: string
  ratings: number
}
