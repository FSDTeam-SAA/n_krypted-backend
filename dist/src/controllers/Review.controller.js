"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkDeleteReviews = exports.getReviewRestaurantSummaries = exports.getAllReviews = exports.getCategoryCheckInStats = exports.getDashboardStats = exports.deleteReview = exports.updateReview = exports.getReviewsByDeal = exports.createReview = exports.getReviewEligibility = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Review_model_1 = __importDefault(require("../models/Review.model"));
const CheckIn_model_1 = __importDefault(require("../models/CheckIn.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
const pagination_1 = require("../utils/pagination");
const reviewPopulate = [
    { path: 'userID', select: 'name email avatar' },
    {
        path: 'dealID',
        select: 'title images owner dishes location category',
        populate: { path: 'category', select: 'categoryName' },
    },
    { path: 'checkInID', select: 'checkedInAt partySize distanceMeters status' },
];
const ownerRestaurantIds = async (req) => {
    if (req.user?.role !== 'restaurant_owner')
        return null;
    const restaurants = await Deal_model_1.default.find({ owner: req.user.id }).select('_id').lean();
    return restaurants.map((restaurant) => restaurant._id);
};
const getReviewEligibility = async (req, res) => {
    const { dealID } = req.params;
    if (!mongoose_1.default.isValidObjectId(dealID)) {
        res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        return;
    }
    const usedCheckIns = await Review_model_1.default.distinct('checkInID', { userID: req.user?.id, dealID });
    const checkIn = await CheckIn_model_1.default.findOne({
        userId: req.user?.id,
        restaurantId: dealID,
        status: 'verified',
        _id: { $nin: usedCheckIns },
    })
        .sort({ checkedInAt: -1 })
        .populate('restaurantId', 'title dishes images');
    res.status(200).json({
        success: true,
        eligible: Boolean(checkIn),
        checkIn,
        message: checkIn
            ? 'Verified check-in found'
            : 'Check in at this restaurant before writing a review',
    });
};
exports.getReviewEligibility = getReviewEligibility;
const createReview = async (req, res) => {
    const { dealID, checkInID, dishID } = req.body;
    const reviewComment = req.body?.reviewComment?.toString().trim();
    const ratings = Number(req.body?.ratings);
    if (!mongoose_1.default.isValidObjectId(dealID) || !reviewComment || !Number.isInteger(ratings)) {
        res.status(400).json({ success: false, message: 'Restaurant, rating and review are required' });
        return;
    }
    if (ratings < 1 || ratings > 5) {
        res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        return;
    }
    const usedCheckIns = await Review_model_1.default.distinct('checkInID', {
        userID: req.user?.id,
        dealID,
    });
    if (checkInID && !mongoose_1.default.isValidObjectId(checkInID)) {
        res.status(400).json({ success: false, message: 'Invalid check-in id' });
        return;
    }
    const checkInFilter = {
        userId: req.user?.id,
        restaurantId: dealID,
        status: 'verified',
        _id: checkInID || { $nin: usedCheckIns },
    };
    const checkIn = await CheckIn_model_1.default.findOne(checkInFilter).sort({ checkedInAt: -1 });
    if (!checkIn) {
        res.status(403).json({
            success: false,
            message: 'A verified, unused check-in at this restaurant is required',
        });
        return;
    }
    if (await Review_model_1.default.exists({ checkInID: checkIn._id })) {
        res.status(409).json({ success: false, message: 'This visit has already been reviewed' });
        return;
    }
    let dishName;
    let normalizedDishId;
    if (dishID) {
        if (!mongoose_1.default.isValidObjectId(dishID)) {
            res.status(400).json({ success: false, message: 'Invalid dish id' });
            return;
        }
        const restaurant = await Deal_model_1.default.findById(dealID).select('dishes');
        const dish = (restaurant?.dishes || []).find((item) => item._id?.toString() === dishID && item.isActive !== false);
        if (!dish) {
            res.status(400).json({ success: false, message: 'Selected dish is not available' });
            return;
        }
        normalizedDishId = new mongoose_1.default.Types.ObjectId(dishID);
        dishName = dish.name;
    }
    const review = await Review_model_1.default.create({
        userID: req.user?.id,
        dealID,
        checkInID: checkIn._id,
        dishID: normalizedDishId,
        dishName,
        reviewComment,
        ratings,
    });
    await review.populate(reviewPopulate);
    res.status(201).json({ success: true, review });
};
exports.createReview = createReview;
const getReviewsByDeal = async (req, res) => {
    const { dealID } = req.params;
    if (!mongoose_1.default.isValidObjectId(dealID)) {
        res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        return;
    }
    const reviews = await Review_model_1.default.find({ dealID })
        .populate(reviewPopulate)
        .sort({ createdAt: -1 });
    res.status(200).json({ success: true, reviews });
};
exports.getReviewsByDeal = getReviewsByDeal;
const updateReview = async (req, res) => {
    const review = await Review_model_1.default.findById(req.params.id);
    if (!review) {
        res.status(404).json({ success: false, message: 'Review not found' });
        return;
    }
    if (review.userID.toString() !== req.user?.id && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const reviewComment = req.body?.reviewComment?.toString().trim();
    const ratings = req.body?.ratings === undefined ? review.ratings : Number(req.body.ratings);
    if (!reviewComment || !Number.isInteger(ratings) || ratings < 1 || ratings > 5) {
        res.status(400).json({ success: false, message: 'A valid rating and review are required' });
        return;
    }
    review.reviewComment = reviewComment;
    review.ratings = ratings;
    await review.save();
    await review.populate(reviewPopulate);
    res.status(200).json({ success: true, review });
};
exports.updateReview = updateReview;
const deleteReview = async (req, res) => {
    const review = await Review_model_1.default.findById(req.params.id).populate('dealID', 'owner');
    if (!review) {
        res.status(404).json({ success: false, message: 'Review not found' });
        return;
    }
    const ownerId = review.dealID?.owner?.toString();
    if (review.userID.toString() !== req.user?.id &&
        req.user?.role !== 'admin' &&
        ownerId !== req.user?.id) {
        res.status(403).json({ success: false, message: 'Unauthorized' });
        return;
    }
    await review.deleteOne();
    res.status(200).json({ success: true, message: 'Review deleted' });
};
exports.deleteReview = deleteReview;
const getDashboardStats = async (req, res) => {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const nextYearStart = new Date(currentYear + 1, 0, 1);
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const restaurantIds = await ownerRestaurantIds(req);
    const dealFilter = restaurantIds ? { _id: { $in: restaurantIds } } : {};
    const checkInFilter = restaurantIds ? { restaurantId: { $in: restaurantIds } } : {};
    const reviewFilter = restaurantIds ? { dealID: { $in: restaurantIds } } : {};
    const [totalCheckIns, customerIds, totalDeals, totalReviews, activeDeals, monthlyActivity, weeklyDeals] = await Promise.all([
        CheckIn_model_1.default.countDocuments(checkInFilter),
        CheckIn_model_1.default.distinct('userId', checkInFilter),
        Deal_model_1.default.countDocuments(dealFilter),
        Review_model_1.default.countDocuments(reviewFilter),
        Deal_model_1.default.countDocuments({ ...dealFilter, status: 'activate' }),
        restaurantIds
            ? CheckIn_model_1.default.aggregate([
                { $match: { ...checkInFilter, checkedInAt: { $gte: yearStart, $lt: nextYearStart } } },
                { $group: { _id: { $month: '$checkedInAt' }, users: { $sum: 1 } } },
            ])
            : User_model_1.default.aggregate([
                { $match: { createdAt: { $gte: yearStart, $lt: nextYearStart } } },
                { $group: { _id: { $month: '$createdAt' }, users: { $sum: 1 } } },
            ]),
        Deal_model_1.default.aggregate([
            { $match: { ...dealFilter, createdAt: { $gte: weekStart, $lt: weekEnd } } },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'activate'] }, 1, 0] } },
                },
            },
        ]),
    ]);
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    res.status(200).json({
        success: true,
        data: {
            totalCheckIns,
            totalCustomers: restaurantIds ? customerIds.length : await User_model_1.default.countDocuments(),
            totalDeals,
            totalReviews,
            activeDeals,
            userGrowthData: months.map((month, index) => ({
                month,
                users: monthlyActivity.find((item) => item._id === index + 1)?.users || 0,
            })),
            restaurantWeeklyData: days.map((day, index) => {
                const entry = weeklyDeals.find((item) => item._id === index + 1);
                return { day, active: entry?.active || 0, total: entry?.total || 0 };
            }),
        },
    });
};
exports.getDashboardStats = getDashboardStats;
const getCategoryCheckInStats = async (_req, res) => {
    const stats = await CheckIn_model_1.default.aggregate([
        { $lookup: { from: 'deals', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
        { $unwind: '$restaurant' },
        { $lookup: { from: 'categories', localField: 'restaurant.category', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $group: { _id: '$category._id', name: { $first: '$category.categoryName' }, value: { $sum: 1 } } },
        { $sort: { value: -1 } },
    ]);
    res.status(200).json(stats);
};
exports.getCategoryCheckInStats = getCategoryCheckInStats;
const getAllReviews = async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const filter = {};
        if (typeof req.query.userId === 'string')
            filter.userID = req.query.userId;
        if (typeof req.query.dealId === 'string')
            filter.dealID = req.query.dealId;
        const restaurantIds = await ownerRestaurantIds(req);
        if (restaurantIds) {
            filter.dealID =
                typeof req.query.dealId === 'string' &&
                    restaurantIds.some((id) => id.toString() === req.query.dealId)
                    ? req.query.dealId
                    : typeof req.query.dealId === 'string'
                        ? { $in: [] }
                        : { $in: restaurantIds };
        }
        const [reviews, totalItems] = await Promise.all([
            Review_model_1.default.find(filter).populate(reviewPopulate).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Review_model_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            meta: (0, pagination_1.buildMetaPagination)(totalItems, page, limit),
            data: reviews,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllReviews = getAllReviews;
const getReviewRestaurantSummaries = async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const restaurantIds = await ownerRestaurantIds(req);
        const match = restaurantIds ? { _id: { $in: restaurantIds } } : {};
        const grouped = await Deal_model_1.default.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'reviews',
                    let: { restaurantId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$dealID', '$$restaurantId'] } } },
                        {
                            $group: {
                                _id: null,
                                totalReviews: { $sum: 1 },
                                averageRating: { $avg: '$ratings' },
                                latestReviewAt: { $max: '$createdAt' },
                            },
                        },
                    ],
                    as: 'reviewStats',
                },
            },
            { $set: { reviewStats: { $first: '$reviewStats' } } },
            {
                $project: {
                    restaurantId: '$_id',
                    restaurantName: '$title',
                    restaurantImages: '$images',
                    location: 1,
                    totalReviews: { $ifNull: ['$reviewStats.totalReviews', 0] },
                    averageRating: { $round: [{ $ifNull: ['$reviewStats.averageRating', 0] }, 2] },
                    latestReviewAt: '$reviewStats.latestReviewAt',
                },
            },
            { $sort: { totalReviews: -1, averageRating: -1, latestReviewAt: -1 } },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }, { $unset: '_id' }],
                    count: [{ $count: 'total' }],
                },
            },
        ]);
        const data = grouped[0]?.data ?? [];
        const totalItems = grouped[0]?.count?.[0]?.total ?? 0;
        res.status(200).json({
            success: true,
            data,
            meta: (0, pagination_1.buildMetaPagination)(totalItems, page, limit),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReviewRestaurantSummaries = getReviewRestaurantSummaries;
const bulkDeleteReviews = async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids)] : [];
    if (ids.length === 0 ||
        ids.some((id) => typeof id !== 'string' || !mongoose_1.default.isValidObjectId(id))) {
        res.status(400).json({ success: false, message: 'A valid list of review ids is required' });
        return;
    }
    const result = await Review_model_1.default.deleteMany({ _id: { $in: ids } });
    res.status(200).json({
        success: true,
        deletedCount: result.deletedCount,
        message: `${result.deletedCount} reviews deleted`,
    });
};
exports.bulkDeleteReviews = bulkDeleteReviews;
