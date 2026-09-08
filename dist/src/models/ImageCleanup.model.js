"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Durable retry queue: only images removed by an authorized edit are queued.
const schema = new mongoose_1.Schema({
    url: { type: String, required: true, unique: true },
    publicId: { type: String, required: true },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    attempts: { type: Number, default: 0 },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('ImageCleanup', schema);
