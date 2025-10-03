"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const FeedbackSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String },
    subject: { type: String },
    message: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Feedback', FeedbackSchema);
