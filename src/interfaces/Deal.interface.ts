// interfaces/Deal.interface.ts

import { Types } from 'mongoose'

export interface IScheduleDate {
  _id?: Types.ObjectId 
  date: Date
  active?: boolean
  participationsLimit?: number
  bookedCount?: number
}

export interface ILocation {
  country?: string
  city?: string
  address?: string
  latitude?: number
  longitude?: number
}

export interface IDish {
  _id?: Types.ObjectId
  name: string
  description?: string
  price: number
  image?: string
  images?: string[]
  category?: string
  specialtyDescription?: string
  ingredients?: string[]
  preparationProcess?: string
  isSignatureDish?: boolean
  isActive?: boolean
}

export interface IDeal {
  _id?: Types.ObjectId
  title: string
  description: string
  popularDeals?: boolean
  shortDescription: string
  participationsLimit?: number
  price: number
  location?: ILocation
  owner?: Types.ObjectId
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  submittedAt?: Date
  approvedAt?: Date
  approvedBy?: Types.ObjectId
  dishes?: IDish[]
  images?: string[]
  offers?: string[]
  status?: 'activate' | 'deactivate'
  category?: Types.ObjectId
  time?: number
  timer?: 'on' | 'off'
  scheduleDates: IScheduleDate[]
  createdAt?: Date
  updatedAt?: Date
}
