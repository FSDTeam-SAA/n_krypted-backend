"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const router = express_1.default.Router();
// Admin-only route
router.get('/admin/dashboard', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), (req, res) => {
    res.json({ message: 'Welcome Admin' });
});
// User or admin route
router.get('/profile', auth_middleware_1.default, (0, authorizeRoles_1.default)('user', 'admin'), (req, res) => {
    res.json({ message: `Welcome ${req.user?.role}` });
});
exports.default = router;
