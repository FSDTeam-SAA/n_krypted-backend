"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookedBookings = exports.deleteBooking = exports.updateBooking = exports.getSingleBooking = exports.getAllBookings = exports.getBookingsNotifyTrue = exports.getBookingsNotifyFalse = exports.createBooking = void 0;
const Booking_model_1 = __importDefault(require("../models/Booking.model"));
const crypto_1 = __importDefault(require("crypto"));
// Create a booking
const createBooking = async (req, res) => {
    try {
        const { dealsId, notifyMe, userId } = req.body;
        if (!dealsId) {
            res.status(400).json({ success: false, message: 'Deal ID is required' });
            return;
        }
        const bookingId = crypto_1.default.randomBytes(5).toString('hex').toUpperCase();
        const booking = await Booking_model_1.default.create({
            userId,
            bookingId,
            dealsId,
            notifyMe: notifyMe || false,
            isBooked: true,
        });
        res.status(201).json({ success: true, booking });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message,
        });
    }
};
exports.createBooking = createBooking;
// Get all bookings by userId where notifyMe is false
const getBookingsNotifyFalse = async (req, res) => {
    try {
        const userId = req.query.user;
        console.log('userID__', userId);
        const bookings = await Booking_model_1.default.find({ userId, notifyMe: false })
            .populate('dealsId')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message,
        });
    }
};
exports.getBookingsNotifyFalse = getBookingsNotifyFalse;
// Get all bookings by userId where notifyMe is true
const getBookingsNotifyTrue = async (req, res) => {
    try {
        const userId = req.query.user;
        console.log('userId__', userId);
        const bookings = await Booking_model_1.default.find({ userId, notifyMe: true })
            .populate('dealsId')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message,
        });
    }
};
exports.getBookingsNotifyTrue = getBookingsNotifyTrue;
// Get all bookings
const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking_model_1.default.find()
            .populate('dealsId')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch all bookings',
            error: error.message,
        });
    }
};
exports.getAllBookings = getAllBookings;
// Get single booking
const getSingleBooking = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('first', id);
        const booking = await Booking_model_1.default.findById(id).populate('dealsId');
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        res.status(200).json({ success: true, data: booking });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message,
        });
    }
};
exports.getSingleBooking = getSingleBooking;
// Update booking
const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const booking = await Booking_model_1.default.findById(id);
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        const updatedBooking = await Booking_model_1.default.findByIdAndUpdate(id, { ...updates }, { new: true }).populate('dealsId');
        res.status(200).json({ success: true, booking: updatedBooking });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message,
        });
    }
};
exports.updateBooking = updateBooking;
// Delete booking
const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking_model_1.default.findById(id);
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        await booking.deleteOne();
        res
            .status(200)
            .json({ success: true, message: 'Booking deleted successfully' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete booking',
            error: error.message,
        });
    }
};
exports.deleteBooking = deleteBooking;
// Get all booked bookings (notifyMe: true)
const getBookedBookings = async (req, res) => {
    try {
        const bookings = await Booking_model_1.default.find({ notifyMe: true })
            .populate('dealsId')
            .populate('userId', 'name email phoneNumber')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booked bookings',
            error: error.message,
        });
    }
};
exports.getBookedBookings = getBookedBookings;
