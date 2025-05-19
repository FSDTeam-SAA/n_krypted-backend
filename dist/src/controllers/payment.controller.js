"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTotalDeals = exports.getTotalCustomers = exports.getTotalBookings = exports.getTotalRevenue = exports.paymentCheckOut = exports.generateClientToken = void 0;
const paypalBraintree_1 = require("../config/paypalBraintree");
const PaymentInfo_model_1 = require("../models/PaymentInfo.model");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const Booking_model_1 = __importDefault(require("../models/Booking.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
// JSON validation middleware
const validateJsonBody = (err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON payload',
            details: err.message,
        });
    }
    next();
};
exports.generateClientToken = (0, asyncHandler_1.default)(async (req, res) => {
    const response = await paypalBraintree_1.gateway.clientToken.generate({});
    res.status(200).json({
        success: true,
        clientToken: response.clientToken,
    });
});
exports.paymentCheckOut = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { amount, paymentMethodNonce, deviceData, bookingId, seasonId, userId, } = req.body;
        // Validate request body
        if (!amount || !paymentMethodNonce || !bookingId || !userId) {
            res.status(400).json({
                success: false,
                error: 'Amount, payment method nonce, and booking ID are required',
            });
            return;
        }
        // Validate amount is a valid number
        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            res.status(400).json({
                success: false,
                error: 'Invalid amount value',
            });
            return;
        }
        // Create payment record with pending status
        const paymentInfo = await PaymentInfo_model_1.PaymentInfo.create({
            userId,
            bookingId,
            price: amount,
            paymentStatus: 'pending',
            seasonId,
            paymentMethodNonce,
        });
        try {
            const result = await paypalBraintree_1.gateway.transaction.sale({
                amount: amount.toString(), // Ensure amount is string
                paymentMethodNonce: paymentMethodNonce,
                deviceData: deviceData,
                options: {
                    submitForSettlement: true,
                },
            });
            if (result.success) {
                // Update payment record with success status and transaction details
                await PaymentInfo_model_1.PaymentInfo.findByIdAndUpdate(paymentInfo._id, {
                    paymentStatus: 'complete',
                    transactionId: result.transaction.id,
                    paymentMethod: result.transaction.paymentInstrumentType,
                });
                res.status(200).json({
                    success: true,
                    transaction: result.transaction,
                    payment: await PaymentInfo_model_1.PaymentInfo.findById(paymentInfo._id),
                });
            }
            else {
                // Update payment record with failed status
                await PaymentInfo_model_1.PaymentInfo.findByIdAndUpdate(paymentInfo._id, {
                    paymentStatus: 'failed',
                });
                res.status(400).json({
                    success: false,
                    error: result.message,
                });
            }
        }
        catch (error) {
            // Update payment record with failed status
            await PaymentInfo_model_1.PaymentInfo.findByIdAndUpdate(paymentInfo._id, {
                paymentStatus: 'failed',
            });
            res.status(500).json({
                success: false,
                error: 'Error processing payment',
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
// Get total revenue
exports.getTotalRevenue = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const payments = await PaymentInfo_model_1.PaymentInfo.find({ paymentStatus: 'complete' });
        const totalRevenue = payments.reduce((acc, payment) => acc + payment.price, 0);
        res.status(200).json({
            success: true,
            totalRevenue,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error fetching total revenue',
        });
    }
});
// Get total bookings count
exports.getTotalBookings = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const totalBookings = await Booking_model_1.default.countDocuments({ isBooked: true });
        res.status(200).json({
            success: true,
            totalBookings,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error fetching total bookings',
        });
    }
});
// Get total customers count
exports.getTotalCustomers = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const totalCustomers = await User_model_1.default.countDocuments();
        res.status(200).json({
            success: true,
            totalCustomers,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error fetching total customers',
        });
    }
});
// Get total deals count
exports.getTotalDeals = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const totalDeals = await Deal_model_1.default.countDocuments();
        res.status(200).json({
            success: true,
            totalDeals,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error fetching total deals',
        });
    }
});
