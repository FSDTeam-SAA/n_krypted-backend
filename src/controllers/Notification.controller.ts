import { Request, Response } from 'express'
import Notification from '../models/Notification.model'

// Get all notifications for a user
export const getUserNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.query.userId

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      })
      return
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate('dealId')

    res.status(200).json({
      success: true,
      notifications,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    })
  }
}

// Mark a notification as read
export const markNotificationAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    )

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      })
      return
    }

    res.status(200).json({
      success: true,
      notification,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    })
  }
}

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.query.userId

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      })
      return
    }

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    )

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    })
  }
} 