"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.updateReview = exports.getReviewsByDeal = exports.createReview = void 0;
const Review_model_1 = __importDefault(require("../models/Review.model"));
// Create a review
const createReview = async (req, res) => {
    try {
        const { dealID, reviewComment, ratings } = req.body;
        const userID = req.user?.id;
        if (!dealID || !reviewComment || !ratings) {
            res
                .status(400)
                .json({ success: false, message: 'All fields are required' });
            return void 0;
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
        const reviews = await Review_model_1.default.find({ dealID }).populate('userID', 'name email');
        res.status(200).json({ success: true, reviews });
        return void 0;
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
        return void 0;
    }
};
exports.getReviewsByDeal = getReviewsByDeal;
// Update a review
const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewComment, ratings } = req.body;
        const review = await Review_model_1.default.findById(id);
        if (!review) {
            res.status(404).json({ success: false, message: 'Review not found' });
            return void 0;
        }
        if (review.userID.toString() !== req.user?.id) {
            res.status(403).json({ success: false, message: 'Unauthorized' });
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
            res.status(404).json({ success: false, message: 'Review not found' });
            return void 0;
        }
        if (review.userID.toString() !== req.user?.id) {
            res.status(403).json({ success: false, message: 'Unauthorized' });
            return void 0;
        }
        await review.deleteOne();
        res.status(200).json({ success: true, message: 'Review deleted' });
        return void 0;
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
        return void 0;
    }
};
exports.deleteReview = deleteReview;
