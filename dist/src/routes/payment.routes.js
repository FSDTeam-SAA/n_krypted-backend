"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const router = express_1.default.Router();
// Generate client token for Braintree
router.get('/payments/client-token', payment_controller_1.generateClientToken);
// Process payment
router.post('/payments/checkout', payment_controller_1.paymentCheckOut);
// Analytics routes
router.get('/analytics/revenue', payment_controller_1.getTotalRevenue);
router.get('/analytics/bookings', payment_controller_1.getTotalBookings);
router.get('/analytics/customers', payment_controller_1.getTotalCustomers);
router.get('/analytics/deals', payment_controller_1.getTotalDeals);
exports.default = router;
