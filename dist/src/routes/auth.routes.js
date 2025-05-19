"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Auth_controller_1 = require("../controllers/Auth.controller");
const multer_middleware_1 = __importDefault(require("../middlewares/multer.middleware"));
const router = express_1.default.Router();
// User Registration
router.post('/register', Auth_controller_1.register);
// User Login
router.post('/login', Auth_controller_1.login);
// Forgot Password
router.post('/forgot-password', Auth_controller_1.forgotPassword);
// Verify Code
router.post('/verify', Auth_controller_1.verifyCode);
// Reset Password
router.post('/reset-password', Auth_controller_1.resetPassword);
// Change Password (Protected Route)
router.post('/change-password', Auth_controller_1.changePassword);
// Update User Information (Protected Route)
router.put('/update-profile', multer_middleware_1.default.single('avatar'), Auth_controller_1.updateUser);
exports.default = router;
