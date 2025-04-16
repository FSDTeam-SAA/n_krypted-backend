import { Types } from 'mongoose'

export interface IReview {
  userID: Types.ObjectId
  reviewComment: string
  ratings: number
}
