import { Request, Response } from 'express'
import Category from '../models/Category.model'
import cloudinary from '../utils/cloudinary'

// Get all categories
export const getAllCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 })
    res.status(200).json({ success: true, categories })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message,
    })
  }
}

// Create a category
export const createCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let imageUrl = ''
    if (req.file) {
      imageUrl = (await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error)
            resolve(result?.secure_url || '')
          }
        )
        stream.end((req.file as Express.Multer.File).buffer)
      })) as string
    }

    if (!imageUrl) {
      res.status(400).json({
        success: false,
        message: 'Image is required',
      })
      return
    }

    const category = new Category({
      categoryName: req.body.categoryName,
      image: imageUrl,
      dealId: req.body.dealId,
    })

    await category.save()
    res.status(201).json({ success: true, category })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message,
    })
  }
}

// Delete a category
export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id)
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      })
      return
    }
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message,
    })
  }
}

// Edit a category
export const editCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let imageUrl = req.body.image
    if (req.file) {
      imageUrl = (await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error)
            resolve(result?.secure_url || '')
          }
        )
        stream.end((req.file as Express.Multer.File).buffer)
      })) as string
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        categoryName: req.body.categoryName,
        image: imageUrl,
        dealId: req.body.dealId,
      },
      { new: true }
    )

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      })
      return
    }

    res.status(200).json({ success: true, category })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message,
    })
  }
}
