import { mongo } from "mongoose"

export interface IBlogComment {
  userId: mongo.ObjectId
  message: string
  blogId: string
  createdAt: Date
}
