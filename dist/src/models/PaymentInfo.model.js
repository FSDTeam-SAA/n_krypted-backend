"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentInfo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const paymentInfoSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    bookingId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    price: { type: Number, required: true },
    paymentStatus: {
        type: String,
        enum: ['complete', 'pending', 'failed'],
        default: 'pending',
    },
    seasonId: { type: String },
    transactionId: { type: String },
    paymentMethodNonce: { type: String },
    paymentMethod: { type: String },
}, {
    timestamps: true,
});
exports.PaymentInfo = mongoose_1.default.model('PaymentInfo', paymentInfoSchema);
