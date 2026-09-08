"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const AppSettings_model_1 = __importDefault(require("../models/AppSettings.model"));
const SiteContent_controller_1 = require("../controllers/SiteContent.controller");
const router = (0, express_1.Router)();
router.get('/content/app-settings', async (_req, res) => {
    const settings = await AppSettings_model_1.default.findOne({ key: 'public' }).lean();
    res.json({ success: true, settings: { instagramUrl: settings?.instagramUrl ?? '', tiktokUrl: settings?.tiktokUrl ?? '' } });
});
router.put('/content/app-settings', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), async (req, res) => {
    const update = {};
    for (const key of ['instagramUrl', 'tiktokUrl']) {
        if (req.body?.[key] === undefined)
            continue;
        const value = String(req.body[key]).trim();
        if (value) {
            try {
                const url = new URL(value);
                if (url.protocol !== 'https:')
                    throw new Error('HTTPS required');
            }
            catch {
                res.status(400).json({ success: false, message: 'A valid HTTPS URL is required' });
                return;
            }
        }
        update[key] = value;
    }
    const settings = await AppSettings_model_1.default.findOneAndUpdate({ key: 'public' }, { $set: update }, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, settings });
});
router.get('/content/legal', (0, asyncHandler_1.default)(SiteContent_controller_1.getLegalContent));
router.put('/content/legal', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), (0, asyncHandler_1.default)(SiteContent_controller_1.updateLegalContent));
exports.default = router;
