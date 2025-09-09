import { Request, Response } from 'express'
import Category from '../models/Category.model'
import cloudinary from '../utils/cloudinary'
import Deal from '../models/Deal.model'
// Get all categories

export const getAllCategoriesWithDealCounts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const totalItems = await Category.countDocuments()
    const totalPages = Math.ceil(totalItems / limit)

    // Fetch paginated categories
    const categories = await Category.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Get deal counts grouped by category
    const dealCounts = await Deal.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ])

    // Map deal counts to categories
    const countsMap = dealCounts.reduce((acc, curr) => {
      acc[curr._id?.toString()] = curr.count
      return acc
    }, {} as Record<string, number>)

    // Add dealCount to each category
    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      dealCount: countsMap[cat._id.toString()] || 0,
    }))

    res.status(200).json({
      success: true,
      data: categoriesWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories with deal counts',
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
