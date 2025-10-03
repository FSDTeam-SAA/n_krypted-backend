"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ReviewSchema = new mongoose_1.Schema({
    userID: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    dealID: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Deal', required: true },
    reviewComment: { type: String, required: true },
    ratings: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Review', ReviewSchema);
