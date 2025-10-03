"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        // Max size for the uploaded file (e.g., the blog cover image)
        fileSize: 20 * 1024 * 1024, // 20MB max
        // CRITICAL FIX: Max size for non-file form fields (like 'description' or 'content').
        // This MUST be large enough to handle the massive Base64 strings.
        fieldSize: 100 * 1024 * 1024, // 100MB for the large content field
    },
});
exports.default = upload;
