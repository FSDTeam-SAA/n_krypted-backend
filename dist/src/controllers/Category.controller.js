"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editCategory = exports.deleteCategory = exports.getAllCategoriesWithDealCounts = exports.createCategory = void 0;
const Category_model_1 = __importDefault(require("../models/Category.model"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
// Get all categories
const createCategory = async (req, res) => {
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
        if (!imageUrl) {
            res.status(400).json({
                success: false,
                message: 'Image is required',
            });
            return;
        }
        const category = new Category_model_1.default({
            categoryName: req.body.categoryName,
            image: imageUrl,
            dealId: req.body.dealId,
        });
        await category.save();
        res.status(201).json({ success: true, category });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message,
        });
    }
};
exports.createCategory = createCategory;
const getAllCategoriesWithDealCounts = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const totalItems = await Category_model_1.default.countDocuments();
        const totalPages = Math.ceil(totalItems / limit);
        // Fetch paginated categories
        const categories = await Category_model_1.default.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        // Get deal counts grouped by category
        const dealCounts = await Deal_model_1.default.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                },
            },
        ]);
        // Map deal counts to categories
        const countsMap = dealCounts.reduce((acc, curr) => {
            acc[curr._id?.toString()] = curr.count;
            return acc;
        }, {});
        // Add dealCount to each category
        const categoriesWithCounts = categories.map((cat) => ({
            ...cat,
            dealCount: countsMap[cat._id.toString()] || 0,
        }));
        res.status(200).json({
            success: true,
            data: categoriesWithCounts,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories with deal counts',
            error: error.message,
        });
    }
};
exports.getAllCategoriesWithDealCounts = getAllCategoriesWithDealCounts;
// Create a category
// Delete a category
const deleteCategory = async (req, res) => {
    try {
        const category = await Category_model_1.default.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message,
        });
    }
};
exports.deleteCategory = deleteCategory;
// Edit a category
const editCategory = async (req, res) => {
    try {
        let imageUrl = req.body.image;
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
        const category = await Category_model_1.default.findByIdAndUpdate(req.params.id, {
            categoryName: req.body.categoryName,
            image: imageUrl,
            dealId: req.body.dealId,
        }, { new: true });
        if (!category) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
            });
            return;
        }
        res.status(200).json({ success: true, category });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: error.message,
        });
    }
};
exports.editCategory = editCategory;
