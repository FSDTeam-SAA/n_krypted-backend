"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CategorySchema = new mongoose_1.Schema({
    categoryName: { type: String, required: true },
    image: { type: String, required: true },
    dealId: { type: mongoose_1.Schema.Types.ObjectId }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Category', CategorySchema);
