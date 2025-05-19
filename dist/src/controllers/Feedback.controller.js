"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFeedback = exports.getAllFeedbacks = exports.createFeedback = void 0;
const Feedback_model_1 = __importDefault(require("../models/Feedback.model"));
// Create feedback
const createFeedback = async (req, res) => {
    try {
        const { name, email, phoneNumber, subject, message } = req.body;
        if (!email || !message) {
            res
                .status(400)
                .json({ success: false, message: 'All fields are required' });
            return;
        }
        const feedback = await Feedback_model_1.default.create({
            name,
            email,
            phoneNumber,
            message,
            subject,
        });
        res.status(201).json({ success: true, feedback });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create feedback',
            error: error.message,
        });
    }
};
exports.createFeedback = createFeedback;
// Get all feedbacks
const getAllFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, feedbacks });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedbacks',
            error: error.message,
        });
    }
};
exports.getAllFeedbacks = getAllFeedbacks;
// Delete feedback
const deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback_model_1.default.findByIdAndDelete(id);
        if (!feedback) {
            res.status(404).json({ success: false, message: 'Feedback not found' });
            return;
        }
        res
            .status(200)
            .json({ success: true, message: 'Feedback deleted successfully' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete feedback',
            error: error.message,
        });
    }
};
exports.deleteFeedback = deleteFeedback;
