"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = void 0;
const Notification_model_1 = __importDefault(require("../models/Notification.model"));
// Get all notifications for a user
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required',
            });
            return;
        }
        const notifications = await Notification_model_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .populate('dealId');
        res.status(200).json({
            success: true,
            notifications,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message,
        });
    }
};
exports.getUserNotifications = getUserNotifications;
// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification_model_1.default.findByIdAndUpdate(id, { isRead: true }, { new: true });
        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            notification,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message,
        });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
// Mark all notifications as read for a user
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required',
            });
            return;
        }
        await Notification_model_1.default.updateMany({ userId, isRead: false }, { isRead: true });
        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message,
        });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
