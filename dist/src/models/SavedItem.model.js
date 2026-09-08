"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Deal', required: true },
    dishId: { type: String, default: '' },
}, { timestamps: true });
schema.index({ userId: 1, restaurantId: 1, dishId: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)('SavedItem', schema);
