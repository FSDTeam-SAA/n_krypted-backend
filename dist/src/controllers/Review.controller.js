"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReviews = exports.getRevenueAndBookingStats = exports.getCategoryBookingStats = exports.getDashboardStats = exports.deleteReview = exports.updateReview = exports.getReviewsAll = exports.getReviewsByDeal = exports.createReview = void 0;
const Review_model_1 = __importDefault(require("../models/Review.model"));
const PaymentInfo_model_1 = require("../models/PaymentInfo.model");
const Booking_model_1 = __importDefault(require("../models/Booking.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
const pagination_1 = require("../utils/pagination");
// Create a review
const createReview = async (req, res) => {
    try {
        const { dealID, reviewComment, ratings } = req.body;
        const userID = req.user?.id;
        if (!dealID || !reviewComment || !ratings) {
            res
                .status(400)
                .json({ success: false, message: "Alle Felder sind Pflichtfelder" });
            return;
        }
        const checkBook = await Booking_model_1.default.findOne({
            dealsId: dealID,
            userId: userID,
            isBooked: true,
        });
        if (!checkBook) {
            res.status(400).json({
                success: false,
                message: "Du musst den Deal zuerst buchen, bevor du ihn bewerten kannst.",
            });
            return;
        }
        const review = await Review_model_1.default.create({
            userID,
            dealID,
            reviewComment,
            ratings,
        });
        res.status(201).json({ success: true, review });
        return void 0;
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
        return void 0;
    }
};
exports.createReview = createReview;
// Get all reviews for a deal
const getReviewsByDeal = async (req, res) => {
    try {
        const { dealID } = req.params;
        const reviews = await Review_model_1.default.find({ dealID }).populate("userID", "name email");
        res.status(200).json({ success: true, reviews });
        return void 0;
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
        return void 0;
    }
};
exports.getReviewsByDeal = getReviewsByDeal;
// get all reviews
const getReviewsAll = async (req, res) => {
    try {
        const reviews = await Review_model_1.default.find().populate("userID dealsId", "name email");
        res.status(200).json({ success: true, reviews });
        return void 0;
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
        return void 0;
    }
};
exports.getReviewsAll = getReviewsAll;
// Update a review
const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewComment, ratings } = req.body;
        const review = await Review_model_1.default.findById(id);
        if (!review) {
            res.status(404).json({ success: false, message: "Review not found" });
            return void 0;
        }
        if (review.userID.toString() !== req.user?.id) {
            res.status(403).json({ success: false, message: "Unauthorized" });
            return void 0;
        }
        review.reviewComment = reviewComment || review.reviewComment;
        review.ratings = ratings || review.ratings;
        await review.save();
        res.status(200).json({ success: true, review });
        return void 0;
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
        return void 0;
    }
};
exports.updateReview = updateReview;
// Delete a review
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review_model_1.default.findById(id);
        if (!review) {
            res.status(404).json({ success: false, message: "Review not found" });
            return void 0;
        }
        if (review.userID.toString() !== req.user?.id &&
            req.user?.role !== "admin") {
            res.status(403).json({ success: false, message: "Unauthorized" });
            return void 0;
        }
        await review.deleteOne();
        res.status(200).json({ success: true, message: "Review deleted" });
        return void 0;
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
        return void 0;
    }
};
exports.deleteReview = deleteReview;
const getDashboardStats = async (req, res) => {
    try {
        const [totalRevenueResult, totalBookings, totalCustomers, totalDeals] = await Promise.all([
            PaymentInfo_model_1.PaymentInfo.aggregate([
                { $match: { paymentStatus: "complete" } },
                { $group: { _id: null, totalRevenue: { $sum: "$price" } } },
            ]),
            Booking_model_1.default.countDocuments(),
            User_model_1.default.countDocuments(),
            Deal_model_1.default.countDocuments(),
        ]);
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
        res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                totalBookings,
                totalCustomers,
                totalDeals,
            },
        });
    }
    catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
};
exports.getDashboardStats = getDashboardStats;
// top bookings for pie chart
const getCategoryBookingStats = async (req, res) => {
    try {
        const stats = await Booking_model_1.default.aggregate([
            {
                $lookup: {
                    from: "deals",
                    localField: "dealsId",
                    foreignField: "_id",
                    as: "deal",
                },
            },
            { $unwind: "$deal" },
            {
                $lookup: {
                    from: "categories",
                    localField: "deal.category",
                    foreignField: "_id",
                    as: "category",
                },
            },
            { $unwind: "$category" },
            {
                $group: {
                    _id: "$category._id",
                    name: { $first: "$category.categoryName" },
                    value: { $sum: 1 },
                },
            },
            {
                $sort: { value: -1 }, // Most booked categories first
            },
        ]);
        res.status(200).json(stats);
    }
    catch (error) {
        console.error("Category booking stats error:", error);
        res.status(500).json({ message: "Failed to fetch category stats" });
    }
};
exports.getCategoryBookingStats = getCategoryBookingStats;
// Statistic Revenue and Booking api
const getRevenueAndBookingStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const revenueData = await PaymentInfo_model_1.PaymentInfo.aggregate([
            {
                $match: {
                    paymentStatus: "complete",
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalRevenue: { $sum: "$price" },
                },
            },
        ]);
        const bookingData = await Booking_model_1.default.aggregate([
            {
                $match: {
                    isBooked: true,
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalBookings: { $sum: 1 },
                },
            },
        ]);
        // Convert to a consistent format
        const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        const stats = months.map((month, index) => {
            const revenueEntry = revenueData.find((item) => item._id === index + 1);
            const bookingEntry = bookingData.find((item) => item._id === index + 1);
            return {
                month,
                revenue: revenueEntry ? revenueEntry.totalRevenue : 0,
                booking: bookingEntry ? bookingEntry.totalBookings : 0,
            };
        });
        res.status(200).json(stats);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch statistics" });
    }
};
exports.getRevenueAndBookingStats = getRevenueAndBookingStats;
const getAllReviews = async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const reviews = await Review_model_1.default.find()
            .populate("userID", "name email")
            .populate("dealID")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const totalDocument = await Review_model_1.default.countDocuments();
        const meta = await (0, pagination_1.buildMetaPagination)(totalDocument, page, limit);
        res.status(200).json({
            success: true,
            meta,
            data: reviews,
        });
    }
    catch (error) { }
};
exports.getAllReviews = getAllReviews;
