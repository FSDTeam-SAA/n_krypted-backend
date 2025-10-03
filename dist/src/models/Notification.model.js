"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['deal_status_change', 'new_deal'],
        required: true
    },
    dealId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Deal' },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Notification', NotificationSchema);
