"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
exports.default = (0, mongoose_1.model)('AppSettings', new mongoose_1.Schema({
    key: { type: String, default: 'public', unique: true },
    instagramUrl: { type: String, default: '' },
    tiktokUrl: { type: String, default: '' },
}, { timestamps: true }));
