"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const BlogSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    authorName: { type: String },
    image: { type: String },
    description: { type: String, required: true },
    // You can remove the manual 'createdAt' field here, as timestamps will add it
    // createdAt: { type: Date, default: Date.now }, 
}, {
    timestamps: true // <--- ADD THIS LINE
});
exports.default = (0, mongoose_1.model)('Blog', BlogSchema);
