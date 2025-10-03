"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const router = express_1.default.Router();
// paypal 
router.post('/paypal/create-order', payment_controller_1.createPaypalOrder);
router.post('/paypal/capture-order', payment_controller_1.capturePaypalPayment);
// stripe payment
router.post('/stripe/create-payment', payment_controller_1.createPayment);
router.post('/stripe/confirm-payment', payment_controller_1.confirmPayment);
// Analytics routes
router.get('/analytics/revenue', payment_controller_1.getTotalRevenue);
router.get('/analytics/bookings', payment_controller_1.getTotalBookings);
router.get('/analytics/customers', payment_controller_1.getTotalCustomers);
router.get('/analytics/deals', payment_controller_1.getTotalDeals);
exports.default = router;
