export type UserRole = 'admin' | 'user' | 'restaurant_owner'

export interface IUser {
  name: string
  email: string
  phoneNumber?: string
  password: string
  verificationCode?: string
  isVerified?: boolean
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  country?: string
  cityState?: string
  role: UserRole
  avatar?: string
}
