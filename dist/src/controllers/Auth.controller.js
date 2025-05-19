"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.changePassword = exports.resetPassword = exports.verifyCode = exports.forgotPassword = exports.login = exports.register = void 0;
const User_model_1 = __importDefault(require("../models/User.model"));
const email_1 = __importDefault(require("../utils/email"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
// User Registration
const register = async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body;
        const existingUser = await User_model_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }
        const verificationCode = crypto_1.default.randomBytes(3).toString('hex');
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = new User_model_1.default({
            name,
            email,
            phoneNumber,
            password: hashedPassword,
            verificationCode,
        });
        await newUser.save();
        await (0, email_1.default)(email, 'Verify Your Email', `Your verification code is: ${verificationCode}`);
        res.status(201).json({
            success: true,
            message: 'User registered. Please verify your email.',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.register = register;
// User Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_model_1.default.findOne({ email });
        if (!user) {
            res
                .status(400)
                .json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            res
                .status(400)
                .json({ success: false, message: 'Invalid email or password' });
            return;
        }
        if (!user.isVerified) {
            res
                .status(400)
                .json({ success: false, message: 'Please verify your email first' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '50h',
        });
        res.status(200).json({ success: true, data: user, token: token });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.login = login;
// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_model_1.default.findOne({ email });
        // Always respond with success to prevent email enumeration
        if (!user) {
            res.status(200).json({
                message: 'If that email is registered, a reset link has been sent.',
            });
            return;
        }
        const resetToken = crypto_1.default.randomBytes(20).toString('hex');
        const resetTokenHash = await bcrypt_1.default.hash(resetToken, 10);
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = new Date(Date.now() + 3600000);
        await user.save();
        // Use a frontend URL for reset
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
        await (0, email_1.default)(email, 'Password Reset Request', `You requested a password reset. Click the link to reset your password: ${resetUrl}`);
        res.status(200).json({
            message: 'If that email is registered, a reset link has been sent.',
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.forgotPassword = forgotPassword;
// Verify Code
const verifyCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User_model_1.default.findOne({ email });
        if (!user) {
            res.status(400).json({ success: false, message: 'User not found' });
            return;
        }
        if (user.isVerified) {
            res.status(400).json({ success: false, message: 'User already verified' });
            return;
        }
        if (user.verificationCode !== code) {
            res
                .status(400)
                .json({ success: false, message: 'Invalid verification code' });
            return;
        }
        user.isVerified = true;
        user.verificationCode = undefined;
        await user.save();
        res
            .status(200)
            .json({ success: true, message: 'Email verified successfully' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.verifyCode = verifyCode;
// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, email, password } = req.body;
        if (!token || !email || !password) {
            res.status(400).json({
                success: false,
                message: 'Token, email, and new password are required',
            });
            return;
        }
        const user = await User_model_1.default.findOne({
            email,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user || !user.resetPasswordToken) {
            res
                .status(400)
                .json({ success: false, message: 'Invalid or expired token' });
            return;
        }
        const isTokenValid = await bcrypt_1.default.compare(token, user.resetPasswordToken);
        if (!isTokenValid) {
            res
                .status(400)
                .json({ success: false, message: 'Invalid or expired token' });
            return;
        }
        user.password = await bcrypt_1.default.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res
            .status(200)
            .json({ success: true, message: 'Password has been reset successfully' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.resetPassword = resetPassword;
// Change Password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, userId } = req.body;
        const user = await User_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            res
                .status(400)
                .json({ success: false, message: 'Current password is incorrect' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.changePassword = changePassword;
// Update User Information
const updateUser = async (req, res) => {
    try {
        let imageUrl = req.body.avatar;
        if (req.file) {
            await new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream((error, result) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    imageUrl = result?.secure_url || '';
                    resolve(result);
                });
                if (!req.file?.buffer) {
                    reject(new Error('File buffer is undefined'));
                    return;
                }
                stream.end(req.file.buffer);
            });
        }
        const { name, phoneNumber, userId, country, cityState } = req.body;
        if (!userId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const user = await User_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Update user fields
        if (name)
            user.name = name;
        if (phoneNumber)
            user.phoneNumber = phoneNumber;
        if (country)
            user.country = country;
        if (cityState)
            user.cityState = cityState;
        if (imageUrl)
            user.avatar = imageUrl;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'User information updated successfully',
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.updateUser = updateUser;
