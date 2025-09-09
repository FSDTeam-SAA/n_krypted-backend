import { Document as MongooseDocument, Types } from "mongoose"

export interface ICategory extends MongooseDocument {
  categoryName: string
  image: string
  dealId: Types.ObjectId
}
