"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeDealStatus = exports.updateDeal = exports.deleteDeal = exports.getSingleDeal = exports.getAllDeals = exports.createDeal = void 0;
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../server");
const socket_1 = require("../socket/socket");
const Category_model_1 = __importDefault(require("../models/Category.model"));
const createDeal = async (req, res) => {
    try {
        const { title, description, price, location, offers, category } = req.body;
        let images = [];
        if (!category) {
            res.status(400).json({
                success: false,
                message: 'Category is required',
            });
            return;
        }
        if (req.files && Array.isArray(req.files)) {
            const uploadPromises = req.files.map((file) => new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                    if (error)
                        return reject(error);
                    resolve(result?.secure_url || '');
                });
                stream.end(file.buffer);
            }));
            images = await Promise.all(uploadPromises);
        }
        const deal = new Deal_model_1.default({
            title,
            description,
            price,
            location,
            images,
            offers: offers || [],
            status: 'activate',
            category: new mongoose_1.default.Types.ObjectId(category),
        });
        await deal.save();
        // Populate the category information before sending response
        const populatedDeal = await Deal_model_1.default.findById(deal._id).populate('category');
        // Notify all users about the new deal
        await (0, socket_1.notifyNewDeal)(server_1.io, populatedDeal);
        res.status(201).json({ success: true, deal: populatedDeal });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create deal',
            error: error.message,
        });
    }
};
exports.createDeal = createDeal;
const getAllDeals = async (req, res) => {
    try {
        const { categoryName, minPrice, maxPrice, location, page = 1, limit = 10, } = req.query;
        // Convert pagination parameters to numbers
        const pageNumber = parseInt(page, 10) || 1;
        const itemsPerPage = parseInt(limit, 10) || 10;
        // Calculate skip value for pagination
        const skip = (pageNumber - 1) * itemsPerPage;
        // Build filter object
        const filter = {};
        // Filter by location if provided (case-insensitive partial match)
        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }
        // Filter by price range if provided
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice)
                filter.price.$gte = Number(minPrice);
            if (maxPrice)
                filter.price.$lte = Number(maxPrice);
        }
        // First get base query
        let query = Deal_model_1.default.find(filter);
        // Add category name filter if provided
        if (categoryName) {
            // First find matching categories
            const matchingCategories = await Category_model_1.default.find({
                categoryName: { $regex: categoryName, $options: 'i' },
            });
            // Filter deals by category IDs
            filter.category = { $in: matchingCategories.map((c) => c._id) };
            // Update the query with the new filter
            query = Deal_model_1.default.find(filter).populate('category');
        }
        else {
            // Always populate the category field
            query = query.populate('category');
        }
        // Count total documents for pagination
        const totalItems = await Deal_model_1.default.countDocuments(filter);
        // Apply pagination to query
        query = query.skip(skip).limit(itemsPerPage).sort({ createdAt: -1 });
        // Execute query
        const deals = await query;
        // Calculate total pages
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        // Create pagination metadata
        const pagination = {
            currentPage: pageNumber,
            totalPages,
            totalItems,
            itemsPerPage,
        };
        res.status(200).json({
            success: true,
            deals,
            pagination,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deals',
            error: error.message,
        });
    }
};
exports.getAllDeals = getAllDeals;
// Get a single deal
const getSingleDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const deal = await Deal_model_1.default.findById(id).populate('category');
        if (!deal) {
            res.status(404).json({ success: false, message: 'Deal not found' });
            return;
        }
        res.status(200).json({ success: true, deal });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deal',
            error: error.message,
        });
    }
};
exports.getSingleDeal = getSingleDeal;
// Delete a deal
const deleteDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const deal = await Deal_model_1.default.findByIdAndDelete(id);
        if (!deal) {
            res.status(404).json({ success: false, message: 'Deal not found' });
            return;
        }
        res
            .status(200)
            .json({ success: true, message: 'Deal deleted successfully' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete deal',
            error: error.message,
        });
    }
};
exports.deleteDeal = deleteDeal;
// Update a deal
const updateDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        let images = updateData.images || [];
        if (updateData.category) {
            updateData.category = new mongoose_1.default.Types.ObjectId(updateData.category);
        }
        if (req.files && Array.isArray(req.files)) {
            const uploadPromises = req.files.map((file) => new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                    if (error)
                        return reject(error);
                    resolve(result?.secure_url || '');
                });
                stream.end(file.buffer);
            }));
            const newImages = await Promise.all(uploadPromises);
            images = [...images, ...newImages];
        }
        const deal = await Deal_model_1.default.findByIdAndUpdate(id, { ...updateData, images }, { new: true }).populate('category');
        if (!deal) {
            res.status(404).json({ success: false, message: 'Deal not found' });
            return;
        }
        res.status(200).json({ success: true, deal });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update deal',
            error: error.message,
        });
    }
};
exports.updateDeal = updateDeal;
// Change deal status (Toggle between activate and deactivate)
const changeDealStatus = async (req, res) => {
    try {
        const { id } = req.params;
        // First find the current deal to get its status
        const currentDeal = await Deal_model_1.default.findById(id);
        if (!currentDeal) {
            res.status(404).json({ success: false, message: 'Deal not found' });
            return;
        }
        // Toggle the status
        const newStatus = currentDeal.status === 'activate' ? 'deactivate' : 'activate';
        // Update with the new status and populate category
        const deal = await Deal_model_1.default.findByIdAndUpdate(id, { status: newStatus }, { new: true }).populate('category');
        try {
            // Notify users who have notifyMe true for this deal
            await (0, socket_1.notifyDealStatusChange)(server_1.io, id, newStatus);
        }
        catch (notificationError) {
            console.error('Failed to send notifications:', notificationError);
            // Continue with the response even if notification fails
        }
        res.status(200).json({ success: true, deal });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to change deal status',
            error: error.message,
        });
    }
};
exports.changeDealStatus = changeDealStatus;
