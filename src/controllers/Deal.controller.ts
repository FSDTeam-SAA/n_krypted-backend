import { Request, Response } from 'express'
import Deal from '../models/Deal.model'
import cloudinary from '../utils/cloudinary'

// Create a new deal
export const createDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, description, price, location, offers } = req.body
    let images: string[] = []

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
    })

    await deal.save()
    res.status(201).json({ success: true, deal })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create deal',
      error: error.message,
    })
  }
}

// Get all deals
export const getAllDeals = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deals = await Deal.find().sort({ createdAt: -1 })
    res.status(200).json({ success: true, deals })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deals',
      error: error.message,
    })
  }
}

// Get a single deal
export const getSingleDeal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const deal = await Deal.findById(id)

    if (!deal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
      return
    }

    res.status(200).json({ success: true, deal })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deal',
      error: error.message,
    })
  }
}

// Delete a deal
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
    )

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

// Change deal status
export const changeDealStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['activate', 'deactivate'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "activate" or "deactivate"',
      })
      return
    }

    const deal = await Deal.findByIdAndUpdate(id, { status }, { new: true })

    if (!deal) {
      res.status(404).json({ success: false, message: 'Deal not found' })
      return
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
