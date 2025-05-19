"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const Review_controller_1 = require("../controllers/Review.controller");
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const router = express_1.default.Router();
// Create a review
router.post('/reviews', auth_middleware_1.default, (0, asyncHandler_1.default)(Review_controller_1.createReview));
// Get all reviews for a deal
router.get('/reviews/deal/:dealID', (0, asyncHandler_1.default)(Review_controller_1.getReviewsByDeal));
// Update a review
router.put('/reviews/:id', auth_middleware_1.default, (0, asyncHandler_1.default)(Review_controller_1.updateReview));
// Delete a review
router.delete('/reviews/:id', auth_middleware_1.default, (0, asyncHandler_1.default)(Review_controller_1.deleteReview));
exports.default = router;
