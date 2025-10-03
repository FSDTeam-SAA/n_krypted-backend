import { Schema, model } from 'mongoose'
import { IBlog } from '../interfaces/Blog.interface'

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    authorName: { type: String },
    image: { type: String },
    description: { type: String, required: true },
    // You can remove the manual 'createdAt' field here, as timestamps will add it
    // createdAt: { type: Date, default: Date.now }, 
  },
  {
    timestamps: true // <--- ADD THIS LINE
  }
)

export default model<IBlog>('Blog', BlogSchema)