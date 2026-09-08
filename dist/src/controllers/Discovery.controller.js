"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverRestaurants = discoverRestaurants;
exports.discoverRestaurant = discoverRestaurant;
exports.discoveryOptions = discoveryOptions;
const mongoose_1 = __importDefault(require("mongoose"));
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
const CheckIn_model_1 = __importDefault(require("../models/CheckIn.model"));
const discovery_1 = require("../utils/discovery");
async function discoverRestaurants(req, res) {
    const q = req.query;
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(q.limit) || 20)));
    const filter = { ...discovery_1.publicRestaurantFilter };
    const and = [];
    const now = new Date();
    if (q.availability === 'upcoming')
        filter.opensAt = { $gt: now };
    else {
        filter.status = 'activate';
        and.push({ $or: [{ opensAt: null }, { opensAt: { $lte: now } }] });
    }
    const search = String(q.search || q.title || '').trim().slice(0, 200);
    if (search) {
        const regex = { $regex: (0, discovery_1.escapeSearch)(search), $options: 'i' };
        and.push({ $or: [{ title: regex }, { description: regex },
                { dishes: { $elemMatch: { name: regex, isActive: { $ne: false } } } }] });
    }
    for (const field of ['city', 'country', 'location']) {
        const value = String(q[field] || '').trim().slice(0, 150);
        if (!value)
            continue;
        const regex = { $regex: (0, discovery_1.escapeSearch)(value), $options: 'i' };
        if (field === 'location')
            and.push({ $or: ['city', 'country', 'address'].map(key => ({ [`location.${key}`]: regex })) });
        else
            filter[`location.${field}`] = regex;
    }
    if (q.category) {
        if (!mongoose_1.default.isValidObjectId(String(q.category))) {
            res.status(400).json({ success: false, message: 'Invalid category' });
            return;
        }
        filter.category = q.category;
    }
    if (and.length)
        filter.$and = and;
    const hasPosition = q.latitude !== undefined || q.longitude !== undefined;
    const lat = Number(q.latitude), lng = Number(q.longitude);
    const radius = q.radiusKm === undefined ? 25 : Number(q.radiusKm);
    if (hasPosition && (!(0, discovery_1.validCoordinates)(lat, lng) || q.latitude === undefined || q.longitude === undefined || !Number.isFinite(radius) || radius <= 0 || radius > 500)) {
        res.status(400).json({ success: false, message: 'Valid coordinates and a radius between 0 and 500 km are required' });
        return;
    }
    let restaurants = await (0, discovery_1.enrichRestaurants)(await Deal_model_1.default.find(filter).populate('category').lean());
    if (q.categoryName)
        restaurants = restaurants.filter(item => item.category?.categoryName?.toLowerCase().includes(String(q.categoryName).toLowerCase()));
    if (q.recommendation === 'dessert') {
        const dessert = /dessert|cafe|café|coffee|kaffee|kuchen|süß|sweet/i;
        restaurants = restaurants.filter(item => dessert.test(item.category?.categoryName || '') ||
            item.dishes.some((dish) => dessert.test(dish.category || '')));
    }
    if (q.cuisine)
        restaurants = restaurants.filter(item => item.category?.categoryName?.toLowerCase() === String(q.cuisine).toLowerCase() ||
            item.dishes.some((dish) => dish.category?.toLowerCase() === String(q.cuisine).toLowerCase()));
    if (hasPosition)
        restaurants = restaurants.flatMap(item => {
            if (!(0, discovery_1.validCoordinates)(item.location?.latitude, item.location?.longitude))
                return [];
            const distance = (0, discovery_1.distanceKm)(lat, lng, item.location.latitude, item.location.longitude);
            return distance <= radius ? [{ ...item, distanceKm: distance }] : [];
        });
    const minimumRating = Math.max(0, Math.min(5, Number(q.minimumRating) || 0));
    restaurants = restaurants.filter(item => item.rating >= minimumRating);
    const price = (item) => item.dishes.length ? Math.min(...item.dishes.map((dish) => dish.price)) : item.price;
    if (q.minPrice !== undefined)
        restaurants = restaurants.filter(item => price(item) >= Number(q.minPrice));
    if (q.maxPrice !== undefined)
        restaurants = restaurants.filter(item => price(item) <= Number(q.maxPrice));
    restaurants.sort((a, b) => {
        let result = 0;
        if (q.sort === 'priceAsc')
            result = price(a) - price(b);
        else if (q.sort === 'priceDesc')
            result = price(b) - price(a);
        else if (q.sort === 'nearest' && hasPosition)
            result = a.distanceKm - b.distanceKm;
        else if (q.availability === 'upcoming')
            result = new Date(a.opensAt).getTime() - new Date(b.opensAt).getTime();
        else
            result = b.rating - a.rating || b.reviewCount - a.reviewCount;
        return result || String(a._id).localeCompare(String(b._id));
    });
    res.json({ success: true, deals: restaurants.slice((page - 1) * limit, page * limit),
        pagination: { currentPage: page, itemsPerPage: limit, totalItems: restaurants.length, totalPages: Math.ceil(restaurants.length / limit) } });
}
async function discoverRestaurant(req, res) {
    const id = String(req.params.id);
    if (!mongoose_1.default.isValidObjectId(id)) {
        res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        return;
    }
    const restaurant = await (0, discovery_1.publicRestaurant)(id);
    if (!restaurant) {
        res.status(404).json({ success: false, message: 'Restaurant not found' });
        return;
    }
    const [enriched, totalCheckIns] = await Promise.all([
        (0, discovery_1.enrichRestaurants)([restaurant]), CheckIn_model_1.default.countDocuments({ restaurantId: restaurant._id, status: 'verified' }),
    ]);
    res.json({ success: true, deal: { ...enriched[0], totalCheckIns } });
}
async function discoveryOptions(_req, res) {
    const restaurants = await Deal_model_1.default.find({ ...discovery_1.publicRestaurantFilter,
        $and: [{ $or: [{ status: 'activate' }, { opensAt: { $gt: new Date() } }] }],
    }).select('location.city dishes.category dishes.isActive category').populate('category', 'categoryName').lean();
    const cities = [...new Set(restaurants.map(item => item.location?.city?.trim()).filter(Boolean))].sort();
    const cuisines = [...new Set(restaurants.flatMap(item => [
            item.category?.categoryName,
            ...(item.dishes || []).filter(dish => dish.isActive !== false).map(dish => dish.category),
        ]).map(value => value?.trim()).filter(Boolean))].sort();
    res.json({ success: true, cities, cuisines });
}
