import mongoose, { Schema, model } from 'mongoose'
import { ICategory } from '../interfaces/Category.interface'

const CategorySchema = new Schema<ICategory>(
  {
    categoryName: { type: String, required: true },
    image: { type: String, required: true },
    dealId: { type: Schema.Types.ObjectId }
  },
  { timestamps: true }
)

export default model<ICategory>('Category', CategorySchema)
