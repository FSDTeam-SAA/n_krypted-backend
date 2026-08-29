import { Types } from 'mongoose'

export interface ICheckIn {
  userId: Types.ObjectId
  restaurantId: Types.ObjectId
  checkedInAt: Date
  partySize: number
  userLocation: {
    latitude: number
    longitude: number
    accuracy?: number
  }
  distanceMeters: number
  status: 'verified'
  createdAt?: Date
  updatedAt?: Date
}
