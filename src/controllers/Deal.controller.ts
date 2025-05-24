import { Request, Response } from 'express'
import Deal from '../models/Deal.model'
import cloudinary from '../utils/cloudinary'
import mongoose from 'mongoose'
import { io } from '../server'
import { notifyNewDeal, notifyDealStatusChange } from '../socket/socket'
import Category from '../models/Category.model'
import Booking from '../models/Booking.model'
import { PaymentInfo } from '../models/PaymentInfo.model'


export const createDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      price,
      location,
      offers,
      category,
      time,
      participationsLimit,
    } = req.body
    let images: string[] = []

    if (!category) {
      res.status(400).json({
        success: false,
        message: 'Category is required',
      })
      return
    }

    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = (req.files as Express.Multer.File[]).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: 'image' },
              (error, result) => {
                if (error) return reject(error)
                resolve(result?.secure_url || '')
              }
            )
            stream.end(file.buffer)
          })
      )
      images = await Promise.all(uploadPromises)
    }

    const deal = new Deal({
      title,
      description,
      price,
      location,
      images,
      offers: offers || [],
      status: 'activate',
      category: new mongoose.Types.ObjectId(category),
      time,
      participationsLimit,
    })

    await deal.save()

    // Populate the category information before sending response
    const populatedDeal = await Deal.findById(deal._id).populate('category')

    // Notify all users about the new deal
    await notifyNewDeal(io, populatedDeal)

    res.status(201).json({ success: true, deal: populatedDeal })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create deal',
      error: error.message,
    })
  }
}


// Get all deals
export type MetaPagination = {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}


// export const getAllDeals = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const {
//       categoryName,
//       minPrice,
//       maxPrice,
//       location,
//       title, 
//       page = 1,
//       limit = 10,
//     } = req.query

//     const pageNumber = parseInt(page as string, 10) || 1
//     const itemsPerPage = parseInt(limit as string, 10) || 10
//     const skip = (pageNumber - 1) * itemsPerPage

//     const filter: any = {}

//     if (location) {
//       filter.location = { $regex: location as string, $options: 'i' }
//     }

//     if (title && (title as string).length >= 2) {
//       filter.title = { $regex: title as string, $options: 'i' }
//     }

//     if (minPrice || maxPrice) {
//       filter.price = {}
//       if (minPrice) filter.price.$gte = Number(minPrice)
//       if (maxPrice) filter.price.$lte = Number(maxPrice)
//     }

//     let query = Deal.find(filter)

//     if (categoryName) {
//       const matchingCategories = await Category.find({
//         categoryName: { $regex: categoryName as string, $options: 'i' },
//       })

//       filter.category = { $in: matchingCategories.map((c) => c._id) }

//       query = Deal.find(filter).populate('category')
//     } else {
//       query = query.populate('category')
//     }

//     const totalItems = await Deal.countDocuments(filter)

//     query = query.skip(skip).limit(itemsPerPage).sort({ createdAt: -1 })

//     const deals = await query

//     const totalPages = Math.ceil(totalItems / itemsPerPage)

//     const pagination: MetaPagination = {
//       currentPage: pageNumber,
//       totalPages,
//       totalItems,
//       itemsPerPage,
//     }

//     res.status(200).json({
//       success: true,
//       deals,
//       pagination,
//     })
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch deals',
//       error: error.message,
//     })
//   }
// }


// Get a single deal









// export const getSingleDeal = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { id } = req.params
//     const deal = await Deal.findById(id).populate('category')

//     if (!deal) {
//       res.status(404).json({ success: false, message: 'Deal not found' })
//       return
//     }

//     res.status(200).json({ success: true, deal })
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch deal',
//       error: error.message,
//     })
//   }
// }

// Delete a deal



export const getAllDeals = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      categoryName,
      minPrice,
      maxPrice,
      location,
      title,
      page = 1,
      limit = 10,
    } = req.query

    const pageNumber = parseInt(page as string, 10) || 1
    const itemsPerPage = parseInt(limit as string, 10) || 10
    const skip = (pageNumber - 1) * itemsPerPage

    const filter: any = {}

    if (location) {
      filter.location = { $regex: location as string, $options: 'i' }
    }

    if (title && (title as string).length >= 2) {
      filter.title = { $regex: title as string, $options: 'i' }
    }

    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }

    if (categoryName) {
      const matchingCategories = await Category.find({
        categoryName: { $regex: categoryName as string, $options: 'i' },
      })

      filter.category = { $in: matchingCategories.map((c) => c._id) }
    }

    const totalItems = await Deal.countDocuments(filter)

    let query = Deal.find(filter)
      .populate('category')
      .skip(skip)
      .limit(itemsPerPage)
      .sort({ createdAt: -1 })

    const deals = await query

    // Get related completed payment bookings
    const bookingDocs = await Booking.find({
      isBooked: true,
      dealsId: { $in: deals.map(d => d._id) }
    }).select('_id dealsId');

    const completedPayments = await PaymentInfo.find({
      bookingId: { $in: bookingDocs.map(b => b._id) },
      paymentStatus: 'complete'
    }).populate('bookingId');

    // Count completed payments per deal
    const paymentCountMap = new Map();
    for (const payment of completedPayments) {
      const booking = payment.bookingId as any;
      const dealId = booking.dealsId.toString();
      paymentCountMap.set(dealId, (paymentCountMap.get(dealId) || 0) + 1);
    }

    // // === Aggregate booking counts AFTER deal update ===
    // const bookingCounts = await Booking.aggregate([
    //   {
    //     $match: {
    //       isBooked: true,
    //       dealsId: { $in: deals.map((d) => d._id) },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'deals',
    //       localField: 'dealsId',
    //       foreignField: '_id',
    //       as: 'dealInfo',
    //     },
    //   },
    //   { $unwind: '$dealInfo' },
    //   {
    //     $match: {
    //       $expr: {
    //         $gt: ['$createdAt', '$dealInfo.updatedAt'],
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: '$dealsId',
    //       count: { $sum: 1 },
    //     },
    //   },
    // ])



    // === Map booking counts to deals ===
    // const bookingMap = new Map(
    //   bookingCounts.map((item) => [item._id.toString(), item.count])
    // )

    const enrichedDeals = deals.map((deal) => {
      const bookingCount = paymentCountMap.get(deal._id.toString()) || 0;
      return {
        ...deal.toObject(),
        bookingCount,
      }
    })

    const totalPages = Math.ceil(totalItems / itemsPerPage)

    const pagination: MetaPagination = {
      currentPage: pageNumber,
      totalPages,
      totalItems,
      itemsPerPage,
    }

    res.status(200).json({
      success: true,
      deals: enrichedDeals,
      pagination,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deals',
      error: error.message,
    })
  }
}

// get single deals
export const getSingleDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const deal = await Deal.findById(id).populate('category')

    if (!deal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
      return
    }

    const bookingCount = await Booking.countDocuments({
      dealsId: deal._id,
      isBooked: true,
      createdAt: { $gt: deal.updatedAt },
    })

    res.status(200).json({
      success: true,
      deal: {
        ...deal.toObject(),
        bookingCount,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deal',
      error: error.message,
    })
  }
}















export const deleteDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const deal = await Deal.findByIdAndDelete(id)
    if (!deal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
      return
    }
    res
      .status(200)
      .json({ success: true, message: 'Deal deleted successfully' })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete deal',
      error: error.message,
    })
  }
}

// Update a deal
export const updateDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }
    let images: string[] = updateData.images || []

    if (updateData.category) {
      updateData.category = new mongoose.Types.ObjectId(updateData.category)
    }

    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = (req.files as Express.Multer.File[]).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: 'image' },
              (error, result) => {
                if (error) return reject(error)
                resolve(result?.secure_url || '')
              }
            )
            stream.end(file.buffer)
          })
      )
      const newImages = await Promise.all(uploadPromises)
      images = [...images, ...newImages]
    }

    const deal = await Deal.findByIdAndUpdate(
      id,
      { ...updateData, images },
      { new: true }
    ).populate('category')

    if (!deal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
      return
    }

    res.status(200).json({ success: true, deal })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update deal',
      error: error.message,
    })
  }
}

// Change deal status (Toggle between activate and deactivate)
export const changeDealStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params

    // First find the current deal to get its status
    const currentDeal = await Deal.findById(id)

    if (!currentDeal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
      return
    }

    // Toggle the status
    const newStatus =
      currentDeal.status === 'activate' ? 'deactivate' : 'activate'

    // Update with the new status and populate category
    const deal = await Deal.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    ).populate('category')

    try {
      // Notify users who have notifyMe true for this deal
      await notifyDealStatusChange(io, id, newStatus)
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError)
      // Continue with the response even if notification fails
    }

    res.status(200).json({ success: true, deal })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to change deal status',
      error: error.message,
    })
  }
}
