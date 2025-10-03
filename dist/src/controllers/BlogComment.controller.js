"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.getCommentsByBlog = exports.createComment = void 0;
const BlogComment_model_1 = __importDefault(require("../models/BlogComment.model"));
// Create a new comment
const createComment = async (req, res) => {
    try {
        const { userId, message, blogId } = req.body;
        const comment = new BlogComment_model_1.default({ userId, message, blogId });
        await comment.save();
        res.status(201).json({ success: true, comment });
    }
    catch (err) {
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to create comment',
            error: err.message,
        });
    }
};
exports.createComment = createComment;
// Get all comments for a blog
const getCommentsByBlog = async (req, res) => {
    try {
        const blogId = req.params.blogId;
        const comments = await BlogComment_model_1.default.find({ blogId }).populate('userId').sort({ createdAt: -1 });
        res.json({ success: true, comments });
    }
    catch (err) {
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to fetch comments',
            error: err.message,
        });
    }
};
exports.getCommentsByBlog = getCommentsByBlog;
// Delete a comment by ID
const deleteComment = async (req, res) => {
    try {
        const comment = await BlogComment_model_1.default.findByIdAndDelete(req.params.id);
        if (!comment) {
            res.status(404).json({ success: false, message: 'Comment not found' });
            return;
        }
        res.json({ success: true, message: 'Comment deleted' });
    }
    catch (err) {
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to delete comment',
            error: err.message,
        });
    }
};
exports.deleteComment = deleteComment;
