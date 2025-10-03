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
