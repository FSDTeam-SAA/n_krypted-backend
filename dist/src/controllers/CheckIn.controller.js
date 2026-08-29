"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInErrorBoundary = exports.getOwnerCheckIns = exports.getUserCheckIns = exports.getAdminCheckIns = exports.getMyCheckIns = exports.createCheckIn = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const CheckIn_model_1 = __importDefault(require("../models/CheckIn.model"));
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
const pagination_1 = require("../utils/pagination");
const MAX_CHECK_IN_DISTANCE_METERS = 100;
const MAX_LOCATION_ACCURACY_METERS = 100;
const toRadians = (degrees) => (degrees * Math.PI) / 180;
const distanceInMeters = (first, second) => {
    const earthRadius = 6371000;
    const latitudeDelta = toRadians(second.latitude - first.latitude);
    const longitudeDelta = toRadians(second.longitude - first.longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(toRadians(first.latitude)) *
            Math.cos(toRadians(second.latitude)) *
            Math.sin(longitudeDelta / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const validCoordinates = (latitude, longitude) => Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
const listCheckIns = async (req, res, baseFilter) => {
    const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
    const filter = { ...baseFilter };
    if (baseFilter.restaurantId === undefined &&
        typeof req.query.restaurantId === 'string') {
        if (!mongoose_1.default.isValidObjectId(req.query.restaurantId)) {
            res.status(400).json({ success: false, message: 'Invalid restaurant id' });
            return;
        }
        filter.restaurantId = req.query.restaurantId;
    }
    if (baseFilter.userId === undefined && typeof req.query.userId === 'string') {
        if (!mongoose_1.default.isValidObjectId(req.query.userId)) {
            res.status(400).json({ success: false, message: 'Invalid user id' });
            return;
        }
        filter.userId = req.query.userId;
    }
    const checkedInAt = {};
    if (typeof req.query.from === 'string') {
        const from = new Date(req.query.from);
        if (!Number.isNaN(from.getTime()))
            checkedInAt.$gte = from;
    }
    if (typeof req.query.to === 'string') {
        const to = new Date(req.query.to);
        if (!Number.isNaN(to.getTime()))
            checkedInAt.$lte = to;
    }
    if (Object.keys(checkedInAt).length)
        filter.checkedInAt = checkedInAt;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [checkIns, totalItems, today] = await Promise.all([
        CheckIn_model_1.default.find(filter)
            .select('-userLocation')
            .populate('userId', 'name email avatar phoneNumber')
            .populate('restaurantId', 'title images location owner')
            .sort({ checkedInAt: -1 })
            .skip(skip)
            .limit(limit),
        CheckIn_model_1.default.countDocuments(filter),
        CheckIn_model_1.default.countDocuments({ ...baseFilter, checkedInAt: { $gte: todayStart } }),
    ]);
    res.status(200).json({
        success: true,
        data: checkIns,
        meta: (0, pagination_1.buildMetaPagination)(totalItems, page, limit),
        stats: { total: totalItems, today },
    });
};
const createCheckIn = async (req, res) => {
    const restaurantId = req.body?.restaurantId;
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const accuracy = req.body?.accuracy === undefined ? undefined : Number(req.body.accuracy);
    const partySize = Number(req.body?.partySize);
    if (!mongoose_1.default.isValidObjectId(restaurantId)) {
        res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        return;
    }
    if (!validCoordinates(latitude, longitude)) {
        res.status(400).json({ success: false, message: 'A valid current location is required' });
        return;
    }
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) {
        res.status(400).json({ success: false, message: 'Party size must be between 1 and 50' });
        return;
    }
    if (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0)) {
        res.status(400).json({ success: false, message: 'Invalid location accuracy' });
        return;
    }
    if (accuracy !== undefined && accuracy > MAX_LOCATION_ACCURACY_METERS) {
        res.status(422).json({
            success: false,
            message: 'Location is not accurate enough. Move outside or enable precise location and try again.',
            maxAccuracyMeters: MAX_LOCATION_ACCURACY_METERS,
        });
        return;
    }
    const restaurant = await Deal_model_1.default.findOne({
        _id: restaurantId,
        status: 'activate',
        $or: [
            { approvalStatus: 'approved' },
            { approvalStatus: { $exists: false } },
        ],
    }).select('title location owner');
    if (!restaurant) {
        res.status(404).json({ success: false, message: 'Active restaurant not found' });
        return;
    }
    const restaurantLatitude = Number(restaurant.location?.latitude);
    const restaurantLongitude = Number(restaurant.location?.longitude);
    if (!validCoordinates(restaurantLatitude, restaurantLongitude)) {
        res.status(409).json({
            success: false,
            message: 'This restaurant does not have a valid map location yet',
        });
        return;
    }
    const distanceMeters = distanceInMeters({ latitude, longitude }, { latitude: restaurantLatitude, longitude: restaurantLongitude });
    if (distanceMeters > MAX_CHECK_IN_DISTANCE_METERS) {
        res.status(403).json({
            success: false,
            message: `You must be within ${MAX_CHECK_IN_DISTANCE_METERS} metres of the restaurant to check in`,
            distanceMeters: Math.round(distanceMeters),
            maxDistanceMeters: MAX_CHECK_IN_DISTANCE_METERS,
        });
        return;
    }
    const checkIn = await CheckIn_model_1.default.create({
        userId: req.user?.id,
        restaurantId,
        partySize,
        userLocation: { latitude, longitude, accuracy },
        distanceMeters: Math.round(distanceMeters * 10) / 10,
        status: 'verified',
    });
    await checkIn.populate([
        { path: 'userId', select: 'name email avatar' },
        { path: 'restaurantId', select: 'title images location owner dishes' },
    ]);
    res.status(201).json({
        success: true,
        message: 'Check-in verified successfully',
        data: checkIn,
        maxDistanceMeters: MAX_CHECK_IN_DISTANCE_METERS,
    });
};
exports.createCheckIn = createCheckIn;
const getMyCheckIns = async (req, res) => listCheckIns(req, res, { userId: req.user?.id });
exports.getMyCheckIns = getMyCheckIns;
const getAdminCheckIns = async (req, res) => listCheckIns(req, res, {});
exports.getAdminCheckIns = getAdminCheckIns;
const getUserCheckIns = async (req, res) => {
    if (!mongoose_1.default.isValidObjectId(req.params.userId)) {
        res.status(400).json({ success: false, message: 'Invalid user id' });
        return;
    }
    return listCheckIns(req, res, { userId: req.params.userId });
};
exports.getUserCheckIns = getUserCheckIns;
const getOwnerCheckIns = async (req, res) => {
    const restaurants = await Deal_model_1.default.find({ owner: req.user?.id }).select('_id');
    return listCheckIns(req, res, {
        restaurantId: { $in: restaurants.map((restaurant) => restaurant._id) },
    });
};
exports.getOwnerCheckIns = getOwnerCheckIns;
const checkInErrorBoundary = (error, _req, res, next) => {
    if (error instanceof mongoose_1.default.Error) {
        res.status(400).json({ success: false, message: error.message });
        return;
    }
    next(error);
};
exports.checkInErrorBoundary = checkInErrorBoundary;
