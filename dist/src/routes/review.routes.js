"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const Review_controller_1 = require("../controllers/Review.controller");
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const router = express_1.default.Router();
// Create a review
router.post('/reviews', auth_middleware_1.default, (0, asyncHandler_1.default)(Review_controller_1.createReview));
// Get all reviews
router.get('/reviews', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), (0, asyncHandler_1.default)(Review_controller_1.getAllReviews));
router.get('/reviews/eligibility/:dealID', auth_middleware_1.default, (0, authorizeRoles_1.default)('user'), (0, asyncHandler_1.default)(Review_controller_1.getReviewEligibility));
// Get all reviews for a deal
router.get('/reviews/deal/:dealID', (0, asyncHandler_1.default)(Review_controller_1.getReviewsByDeal));
// Update a review
router.put('/reviews/:id', auth_middleware_1.default, (0, asyncHandler_1.default)(Review_controller_1.updateReview));
// Delete a review
router.delete('/reviews/bulk', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), (0, asyncHandler_1.default)(Review_controller_1.bulkDeleteReviews));
router.delete('/reviews/:id', auth_middleware_1.default, (0, asyncHandler_1.default)(Review_controller_1.deleteReview));
// Get dashboard stats
router.get('/dashboard/stats', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), (0, asyncHandler_1.default)(Review_controller_1.getDashboardStats));
// top bookings for pie chart
router.get('/check-in-stats', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), (0, asyncHandler_1.default)(Review_controller_1.getCategoryCheckInStats));
exports.default = router;
