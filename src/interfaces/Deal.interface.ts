import { Types } from 'mongoose';

export interface IDeal {
  title: string
  description: string
  participations: number
  price: number
  location: string
  images: string[]
  offers?: string[]
  status: 'activate' | 'deactivate'
  category: Types.ObjectId
}
