import { Schema, model } from 'mongoose'

export interface ISiteContent {
  key: 'legal'
  termsHtml: string
  privacyHtml: string
  updatedBy?: Schema.Types.ObjectId
}

const SiteContentSchema = new Schema<ISiteContent>(
  {
    key: { type: String, enum: ['legal'], required: true, unique: true },
    termsHtml: { type: String, default: '' },
    privacyHtml: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export default model<ISiteContent>('SiteContent', SiteContentSchema)
