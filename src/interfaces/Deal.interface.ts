import { Types } from 'mongoose';

export interface IDeal {
  title: string
  description: string
  participationsLimit: number
  price: number
  location: string
  images: string[]
  offers?: string[]
  status: 'activate' | 'deactivate'
  category: Types.ObjectId
  time: number
  createdAt?: Date
  updatedAt?: Date
}
