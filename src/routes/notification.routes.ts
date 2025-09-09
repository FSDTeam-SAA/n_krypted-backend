import express from 'express'
import * as notificationController from '../controllers/Notification.controller'

const router = express.Router()

// Get all notifications for a user
router.get('/notifications', notificationController.getUserNotifications)

// Mark a notification as read
router.patch('/notifications/:id/read', notificationController.markNotificationAsRead)

// Mark all notifications as read for a user
router.patch('/notifications/read-all', notificationController.markAllNotificationsAsRead)

export default router 