export interface IUser {
  name: string
  email: string
  phoneNumber?: string
  password: string
  verificationCode?: string
  isVerified?: boolean
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  country?: String
  cityState?: String
  role: String
  avatar: String
}
