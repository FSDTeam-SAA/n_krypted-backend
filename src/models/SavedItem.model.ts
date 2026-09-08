import { Schema, model } from 'mongoose'

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Deal', required: true },
  dishId: { type: String, default: '' },
}, { timestamps: true })
schema.index({ userId: 1, restaurantId: 1, dishId: 1 }, { unique: true })
export default model('SavedItem', schema)
