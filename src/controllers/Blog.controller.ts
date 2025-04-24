import { Request, Response } from 'express'
import Blog from '../models/Blog.model'
import cloudinary from '../utils/cloudinary'

export const createBlog = async (req: Request, res: Response) => {
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
    const blog = new Blog({
      ...req.body,
      image: imageUrl,
    })
    await blog.save()
    res.status(201).json({success:true, blog})
  } catch (err: any) {
    res
      .status(500)
      .json({success:false, message: 'Failed to create blog', error: err.message })
  }
}

export const getBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 })
    res.json({ success: true, blogs })
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch blogs', error: err })
  }
}

export const getBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await Blog.findById(req.params.id)
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' })
      return
    }
    res.json({ success: true, blog })
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch blog', error: err })
  }
}

export const updateBlog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let imageUrl = req.body.image
    if (req.file) {
      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((error, result) => {
          if (error) {
            reject(error)
            return
          }
          imageUrl = result?.secure_url || ''
          resolve(result)
        })
        if (!req.file?.buffer) {
          reject(new Error('File buffer is undefined'))
          return
        }
        stream.end(req.file.buffer)
      })
    }
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { ...req.body, image: imageUrl },
      { new: true }
    )
    if (!blog) {
      res.status(404).json({ message: 'Blog not found' })
      return
    }
    res.json({ success: false, blog })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update blog', error: err })
  }
}

export const deleteBlog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id)
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' })
      return
    }
    res.json({ success: true, message: 'Blog deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete blog', error: err })
  }
}
