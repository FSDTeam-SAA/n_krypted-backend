"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.updateBlog = exports.getBlog = exports.getBlogs = exports.createBlog = void 0;
const Blog_model_1 = __importDefault(require("../models/Blog.model"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const createBlog = async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            imageUrl = (await new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                    if (error)
                        return reject(error);
                    resolve(result?.secure_url || '');
                });
                stream.end(req.file.buffer);
            }));
        }
        const blog = new Blog_model_1.default({
            ...req.body,
            image: imageUrl,
        });
        await blog.save();
        res.status(201).json({ success: true, blog });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Failed to create blog', error: err.message });
    }
};
exports.createBlog = createBlog;
// get all blogs
const getBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [blogs, totalItems] = await Promise.all([
            Blog_model_1.default.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Blog_model_1.default.countDocuments(),
        ]);
        const totalPages = Math.ceil(totalItems / limit);
        res.json({
            success: true,
            blogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
            },
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blogs',
            error: err,
        });
    }
};
exports.getBlogs = getBlogs;
// get single blogs
const getBlog = async (req, res) => {
    try {
        const blog = await Blog_model_1.default.findById(req.params.id);
        if (!blog) {
            res.status(404).json({ success: false, message: 'Blog not found' });
            return;
        }
        res.json({ success: true, blog });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Failed to fetch blog', error: err });
    }
};
exports.getBlog = getBlog;
const updateBlog = async (req, res) => {
    try {
        let imageUrl = req.body.image;
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
        const blog = await Blog_model_1.default.findByIdAndUpdate(req.params.id, { ...req.body, image: imageUrl }, { new: true });
        if (!blog) {
            res.status(404).json({ message: 'Blog not found' });
            return;
        }
        res.json({ success: false, blog });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update blog', error: err });
    }
};
exports.updateBlog = updateBlog;
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog_model_1.default.findByIdAndDelete(req.params.id);
        if (!blog) {
            res.status(404).json({ success: false, message: 'Blog not found' });
            return;
        }
        res.json({ success: true, message: 'Blog deleted' });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to delete blog', error: err });
    }
};
exports.deleteBlog = deleteBlog;
