import mongoose, { Schema, model } from 'mongoose'
import { IBlogComment } from '../interfaces/BlogComment.interface'

const BlogCommentSchema = new Schema<IBlogComment>({
  userId: { type:mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  blogId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default model<IBlogComment>('BlogComment', BlogCommentSchema)
