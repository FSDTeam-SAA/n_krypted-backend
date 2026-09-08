import { Schema, model } from 'mongoose'
export default model('AppSettings', new Schema({
  key: { type: String, default: 'public', unique: true },
  instagramUrl: { type: String, default: '' },
  tiktokUrl: { type: String, default: '' },
}, { timestamps: true }))
