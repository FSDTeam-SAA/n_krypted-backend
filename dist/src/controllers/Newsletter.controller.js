"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewsletter = exports.listSubscribers = exports.unsubscribe = exports.subscribe = void 0;
const Newsletter_model_1 = __importDefault(require("../models/Newsletter.model"));
const email_1 = __importDefault(require("../utils/email"));
// Subscribe to newsletter
const subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' });
            return;
        }
        const existing = await Newsletter_model_1.default.findOne({ email });
        if (existing) {
            res
                .status(400)
                .json({ success: false, message: 'Email already subscribed' });
            return;
        }
        await Newsletter_model_1.default.create({ email });
        res.status(201).json({ success: true, message: 'Subscribed successfully' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.subscribe = subscribe;
// Unsubscribe from newsletter
const unsubscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' });
            return;
        }
        const deleted = await Newsletter_model_1.default.findOneAndDelete({ email });
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Email not found' });
            return;
        }
        res
            .status(200)
            .json({ success: true, message: 'Unsubscribed successfully' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.unsubscribe = unsubscribe;
// List all subscribers (admin only, simple version)
const listSubscribers = async (req, res) => {
    try {
        const subscribers = await Newsletter_model_1.default.find({}, 'email createdAt');
        res.status(200).json({ success: true, subscribers });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.listSubscribers = listSubscribers;
// Send newsletter to all subscribers
const sendNewsletter = async (req, res) => {
    try {
        const { subject, content } = req.body;
        if (!subject || !content) {
            res
                .status(400)
                .json({ success: false, message: 'Subject and content are required' });
            return;
        }
        const subscribers = await Newsletter_model_1.default.find({}, 'email');
        const emails = subscribers.map((s) => s.email);
        for (const email of emails) {
            await (0, email_1.default)(email, subject, content);
        }
        res
            .status(200)
            .json({ success: true, message: 'Newsletter sent to all subscribers' });
    }
    catch (error) {
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to send newsletter',
            error: error.message,
        });
    }
};
exports.sendNewsletter = sendNewsletter;
