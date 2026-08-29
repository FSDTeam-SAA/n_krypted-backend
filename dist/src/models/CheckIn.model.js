"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CheckInSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    restaurantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Deal',
        required: true,
        index: true,
    },
    checkedInAt: { type: Date, default: Date.now, required: true, index: true },
    partySize: { type: Number, required: true, min: 1, max: 50 },
    userLocation: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        accuracy: { type: Number },
    },
    distanceMeters: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['verified'], default: 'verified' },
}, { timestamps: true });
CheckInSchema.index({ restaurantId: 1, checkedInAt: -1 });
CheckInSchema.index({ userId: 1, checkedInAt: -1 });
exports.default = (0, mongoose_1.model)('CheckIn', CheckInSchema);
