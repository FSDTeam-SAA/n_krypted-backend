"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SubscriptionSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Subscription', SubscriptionSchema);
