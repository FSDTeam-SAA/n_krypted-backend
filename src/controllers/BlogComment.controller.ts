import { Request, Response } from 'express'
import BlogComment from '../models/BlogComment.model'

// Create a new comment
export const createComment = async (req: Request, res: Response) => {
  try {
    const { userId, message, blogId } = req.body
    const comment = new BlogComment({ userId, message, blogId })
    await comment.save()
    res.status(201).json({ success: true, comment })
  } catch (err: any) {
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to create comment',
        error: err.message,
      })
  }
}

// Get all comments for a blog
export const getCommentsByBlog = async (req: Request, res: Response) => {
  try {
    const blogId = req.params.blogId
    const comments = await BlogComment.find({ blogId }).populate('userId').sort({ createdAt: -1 })
    res.json({ success: true, comments })
  } catch (err: any) {
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to fetch comments',
        error: err.message,
      })
  }
}

// Delete a comment by ID
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const comment = await BlogComment.findByIdAndDelete(req.params.id)
    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' })
      return
    }
    res.json({ success: true, message: 'Comment deleted' })
  } catch (err: any) {
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to delete comment',
        error: err.message,
      })
  }
}
