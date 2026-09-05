"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const SiteContent_controller_1 = require("../controllers/SiteContent.controller");
const router = (0, express_1.Router)();
router.get('/content/legal', (0, asyncHandler_1.default)(SiteContent_controller_1.getLegalContent));
router.put('/content/legal', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), (0, asyncHandler_1.default)(SiteContent_controller_1.updateLegalContent));
exports.default = router;
