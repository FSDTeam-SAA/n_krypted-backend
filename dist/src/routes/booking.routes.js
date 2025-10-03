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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController = __importStar(require("../controllers/Booking.controller"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const router = (0, express_1.Router)();
// Create a new booking
router.post('/bookings', auth_middleware_1.default, bookingController.createBooking);
// Get all bookings
router.get('/bookings', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), bookingController.getAllBookings);
// Get all booked bookings notifyMe
router.get('/bookings/booked', auth_middleware_1.default, bookingController.getBookedBookings);
// Get bookings by userId where notifyMe is false
router.get('/bookings/notify-false', auth_middleware_1.default, bookingController.getBookingsNotifyFalse);
// Get bookings by userId where notifyMe is true
router.get('/bookings/notify-true', auth_middleware_1.default, bookingController.getBookingsNotifyTrue);
// Get single booking
router.get('/bookings/:id', bookingController.getSingleBooking);
// Update booking
router.put('/bookings/:id', bookingController.updateBooking);
// Delete booking
router.delete('/bookings/:id', auth_middleware_1.default, bookingController.deleteBooking);
exports.default = router;
