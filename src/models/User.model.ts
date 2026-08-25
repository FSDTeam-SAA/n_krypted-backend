import { Schema, model } from 'mongoose'
import { IUser } from '../interfaces/User.interface'

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Optional: the sign-up screen collects name, e-mail and password only, so
    // requiring this rejected every registration the app could produce.
    phoneNumber: { type: String },
    password: { type: String, required: true },
    verificationCode: { type: String },
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    country: { type: String },
    cityState: { type: String },
    role: {
      type: String,
      enum: ['admin', 'user', 'restaurant_owner'],
      default: 'user',
    },
    avatar: { type: String }
  },
  { timestamps: true }
)

export default model<IUser>('User', UserSchema)
