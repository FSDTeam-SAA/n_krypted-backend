"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.updateBlog = exports.getBlog = exports.getBlogs = exports.createBlog = void 0;
const Blog_model_1 = __importDefault(require("../models/Blog.model"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const inlineImages_1 = require("../utils/inlineImages");
const createBlog = async (req, res) => {
    try {
        let imageUrl = '';
        // Retrieve content, checking for both 'description' (as per schema) or 'content' (common frontend name)
        let blogContent = req.body.description || req.body.content;
        // 1. Process inline images in the content: This function uploads Base64 to Cloudinary 
        // and rewrites the HTML string with the new, small Cloudinary URLs.
        if (blogContent) {
            blogContent = await (0, inlineImages_1.replaceInlineImagesWithCloudinary)(blogContent);
        }
        console.log("Processed blog content:", blogContent);
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
        // 2. Manually construct the Blog object to ensure the PROCESSED content 
        // is correctly mapped to the 'description' field.
        const blog = new Blog_model_1.default({
            title: req.body.title,
            authorName: req.body.authorName,
            image: imageUrl,
            description: blogContent, // CRITICAL: Use the cleaned, non-Base64 HTML
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
            Blog_model_1.default.find().sort({ updatedAt: -1 }).skip(skip).limit(limit),
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
        // 1. Process inline images in the content
        if (req.body.content) {
            req.body.content = await (0, inlineImages_1.replaceInlineImagesWithCloudinary)(req.body.content);
        }
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
        // 2. Use the updated req.body and imageUrl for the update
        const blog = await Blog_model_1.default.findByIdAndUpdate(req.params.id, { ...req.body, image: imageUrl }, // req.body now contains the modified content
        { new: true });
        if (!blog) {
            res.status(404).json({ success: false, message: 'Blog not found' });
            return;
        }
        // Note: The original response was { success: false, blog }. I'm correcting this to true.
        res.json({ success: true, blog });
    }
    catch (err) {
        // Ensure error handling is consistent
        res.status(500).json({ success: false, message: 'Failed to update blog', error: err.message });
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
