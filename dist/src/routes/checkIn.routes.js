"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const CheckIn_controller_1 = require("../controllers/CheckIn.controller");
const router = (0, express_1.Router)();
router.post('/check-ins', auth_middleware_1.default, (0, authorizeRoles_1.default)('user'), (0, asyncHandler_1.default)(CheckIn_controller_1.createCheckIn));
router.get('/check-ins/my', auth_middleware_1.default, (0, authorizeRoles_1.default)('user'), (0, asyncHandler_1.default)(CheckIn_controller_1.getMyCheckIns));
router.get('/check-ins/admin', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), (0, asyncHandler_1.default)(CheckIn_controller_1.getAdminCheckIns));
router.get('/check-ins/owner', auth_middleware_1.default, (0, authorizeRoles_1.default)('restaurant_owner'), (0, asyncHandler_1.default)(CheckIn_controller_1.getOwnerCheckIns));
router.get('/check-ins/user/:userId', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), (0, asyncHandler_1.default)(CheckIn_controller_1.getUserCheckIns));
exports.default = router;
