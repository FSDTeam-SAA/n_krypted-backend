"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SiteContentSchema = new mongoose_1.Schema({
    key: { type: String, enum: ['legal'], required: true, unique: true },
    termsHtml: { type: String, default: '' },
    privacyHtml: { type: String, default: '' },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('SiteContent', SiteContentSchema);
