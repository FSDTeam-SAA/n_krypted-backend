"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const DealSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    participationsLimit: { type: Number, default: 0 },
    price: { type: Number, required: true },
    location: {
        country: { type: String },
        city: { type: String },
    },
    images: [{ type: String }],
    offers: [{ type: String }],
    status: { type: String, enum: ['activate', 'deactivate'] },
    category: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Category' },
    time: { type: Number },
    timer: { type: String, enum: ['on', 'off'], default: 'off' },
    scheduleDates: [
        {
            date: { type: Date, required: true },
            active: { type: Boolean, default: true },
            participationsLimit: { type: Number, default: 0 },
            bookedCount: { type: Number, default: 0 }, // Track bookings per date
        },
    ],
    popularDeals: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Deal', DealSchema);
