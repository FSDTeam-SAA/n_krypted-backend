"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validCoordinates = exports.escapeSearch = exports.publicRestaurantFilter = void 0;
exports.distanceKm = distanceKm;
exports.enrichRestaurants = enrichRestaurants;
exports.publicRestaurant = publicRestaurant;
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
const Review_model_1 = __importDefault(require("../models/Review.model"));
exports.publicRestaurantFilter = {
    $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }],
};
const escapeSearch = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
exports.escapeSearch = escapeSearch;
function distanceKm(lat, lng, toLat, toLng) {
    const rad = (value) => value * Math.PI / 180;
    const a = Math.sin(rad(toLat - lat) / 2) ** 2 +
        Math.cos(rad(lat)) * Math.cos(rad(toLat)) * Math.sin(rad(toLng - lng) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
const validCoordinates = (lat, lng) => typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
exports.validCoordinates = validCoordinates;
/** Public statistics always come from persisted reviews, including dish totals. */
async function enrichRestaurants(restaurants) {
    if (!restaurants.length)
        return [];
    const ids = restaurants.map(item => item._id);
    const stats = await Review_model_1.default.aggregate([
        { $match: { dealID: { $in: ids } } },
        { $group: { _id: { restaurant: '$dealID', dish: '$dishID' },
                count: { $sum: 1 }, total: { $sum: '$ratings' } } },
    ]);
    return restaurants.map(restaurant => {
        const rows = stats.filter(row => String(row._id.restaurant) === String(restaurant._id));
        const reviewCount = rows.reduce((sum, row) => sum + row.count, 0);
        return {
            ...restaurant,
            reviewCount,
            rating: reviewCount ? rows.reduce((sum, row) => sum + row.total, 0) / reviewCount : 0,
            dishes: (restaurant.dishes || []).filter((dish) => dish.isActive !== false).map((dish) => {
                const row = rows.find(item => String(item._id.dish) === String(dish._id));
                return { ...dish, rating: row ? row.total / row.count : 0, reviewCount: row?.count || 0 };
            }),
        };
    });
}
async function publicRestaurant(id) {
    return Deal_model_1.default.findOne({ _id: id, ...exports.publicRestaurantFilter,
        $and: [{ $or: [{ status: 'activate' }, { opensAt: { $gt: new Date() } }] }],
    }).populate('category').lean();
}
