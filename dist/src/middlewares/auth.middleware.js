"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_model_1 = __importDefault(require("../models/User.model"));
const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_model_1.default.findById(decoded.id).select('role');
        if (!user) {
            res.status(401).json({ message: 'User not found' });
            return;
        }
        req.user = { id: decoded.id, role: user.role };
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
exports.default = protect;
