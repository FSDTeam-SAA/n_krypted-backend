import { Schema, model } from 'mongoose'

// Durable retry queue: only images removed by an authorized edit are queued.
const schema = new Schema({
  url: { type: String, required: true, unique: true },
  publicId: { type: String, required: true },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: true })
export default model('ImageCleanup', schema)
