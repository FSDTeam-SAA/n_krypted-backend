import { Schema, model } from 'mongoose'
import { IBlog } from '../interfaces/Blog.interface'

const BlogSchema = new Schema<IBlog>({
  title: { type: String, required: true },
  image: { type: String },
  description: { type: String, require: true },
  createdAt: { type: Date, default: Date.now },
})

export default model<IBlog>('Blog', BlogSchema)
