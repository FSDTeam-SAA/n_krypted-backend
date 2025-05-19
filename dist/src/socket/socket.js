"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDealStatusChange = exports.notifyNewDeal = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const Booking_model_1 = __importDefault(require("../models/Booking.model"));
const Notification_model_1 = __importDefault(require("../models/Notification.model"));
// Store connected users
const connectedUsers = new Map();
const initializeSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['Get', 'POST'],
        },
    });
    // socket.io connection
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        // Handle user authentication
        socket.on('authenticate', async (userId) => {
            // Store the user's socket ID
            connectedUsers.set(userId, socket.id);
            console.log(`User ${userId} authenticated with socket ${socket.id}`);
            // Send any pending notifications to the user
            try {
                const notifications = await Notification_model_1.default.find({
                    userId,
                    isRead: false
                }).sort({ createdAt: -1 });
                if (notifications.length > 0) {
                    socket.emit('pending_notifications', notifications);
                }
            }
            catch (error) {
                console.error('Error fetching pending notifications:', error);
            }
        });
        // Handle marking notifications as read
        socket.on('mark_notification_read', async (notificationId) => {
            try {
                await Notification_model_1.default.findByIdAndUpdate(notificationId, { isRead: true });
            }
            catch (error) {
                console.error('Error marking notification as read:', error);
            }
        });
        // Handle disconnection
        socket.on('disconnect', () => {
            // Remove the user from connectedUsers
            for (const [userId, socketId] of connectedUsers.entries()) {
                if (socketId === socket.id) {
                    connectedUsers.delete(userId);
                    console.log(`User ${userId} disconnected`);
                    break;
                }
            }
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
// Function to notify all users about new deal
const notifyNewDeal = async (io, deal) => {
    // Emit to all connected users
    io.emit('new_deal', {
        message: 'New deal available!',
        deal
    });
    // Store notification for all users who have notifyMe true
    try {
        const bookings = await Booking_model_1.default.find({ notifyMe: true }).populate('userId');
        for (const booking of bookings) {
            const userId = booking.userId;
            const userSocketId = connectedUsers.get(userId.toString());
            // If user is not connected, store the notification
            if (!userSocketId) {
                await Notification_model_1.default.create({
                    userId,
                    message: 'New deal available!',
                    type: 'new_deal',
                    dealId: deal._id
                });
            }
        }
    }
    catch (error) {
        console.error('Error storing new deal notifications:', error);
    }
};
exports.notifyNewDeal = notifyNewDeal;
// Function to notify specific users about deal status change
const notifyDealStatusChange = async (io, dealsId, newStatus) => {
    try {
        // Find all bookings with notifyMe true for this deal
        const bookings = await Booking_model_1.default.find({
            dealsId: dealsId,
            notifyMe: true,
        }).populate('userId');
        if (!bookings || bookings.length === 0) {
            console.log('No users to notify for this deal status change');
            return;
        }
        // Notify each user who has notifyMe true
        for (const booking of bookings) {
            const userId = booking.userId;
            const userSocketId = connectedUsers.get(userId.toString());
            if (userSocketId) {
                // User is connected, send real-time notification
                io.to(userSocketId).emit('deal_status_change', {
                    message: `Deal status changed to ${newStatus}`,
                    dealsId,
                    newStatus,
                });
            }
            else {
                // User is not connected, store the notification
                await Notification_model_1.default.create({
                    userId,
                    message: `Deal status changed to ${newStatus}`,
                    type: 'deal_status_change',
                    dealId: dealsId
                });
            }
        }
    }
    catch (error) {
        console.error('Error notifying users about deal status change:', error);
        throw error;
    }
};
exports.notifyDealStatusChange = notifyDealStatusChange;
