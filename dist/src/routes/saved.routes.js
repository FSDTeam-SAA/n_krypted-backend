"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const SavedItem_model_1 = __importDefault(require("../models/SavedItem.model"));
const discovery_1 = require("../utils/discovery");
const router = (0, express_1.Router)();
router.use('/saved', auth_middleware_1.default);
router.get('/saved', async (req, res) => {
    const items = await SavedItem_model_1.default.find({ userId: req.user?.id }).sort({ createdAt: -1 }).lean();
    const restaurants = await Promise.all([...new Set(items.map(item => String(item.restaurantId)))].map(discovery_1.publicRestaurant));
    const enriched = await (0, discovery_1.enrichRestaurants)(restaurants.filter(Boolean));
    res.json({ success: true, items: items.flatMap(item => {
            const restaurant = enriched.find(value => String(value._id) === String(item.restaurantId));
            if (!restaurant || (item.dishId && !restaurant.dishes.some((dish) => String(dish._id) === item.dishId)))
                return [];
            return [{ restaurant, dishId: item.dishId }];
        }) });
});
router.put('/saved/:restaurantId', async (req, res) => {
    const restaurantId = String(req.params.restaurantId), dishId = String(req.body?.dishId || '');
    if (!mongoose_1.default.isValidObjectId(restaurantId) || (dishId && !mongoose_1.default.isValidObjectId(dishId))) {
        res.status(400).json({ success: false, message: 'Invalid restaurant or dish' });
        return;
    }
    const restaurant = await (0, discovery_1.publicRestaurant)(restaurantId);
    if (!restaurant || (dishId && !restaurant.dishes?.some(dish => String(dish._id) === dishId && dish.isActive !== false))) {
        res.status(404).json({ success: false, message: 'Restaurant or dish unavailable' });
        return;
    }
    await SavedItem_model_1.default.updateOne({ userId: req.user?.id, restaurantId, dishId }, { $setOnInsert: { userId: req.user?.id, restaurantId, dishId } }, { upsert: true });
    res.json({ success: true });
});
router.delete('/saved/:restaurantId', async (req, res) => {
    const restaurantId = String(req.params.restaurantId), dishId = String(req.query.dishId || '');
    if (!mongoose_1.default.isValidObjectId(restaurantId)) {
        res.status(400).json({ success: false, message: 'Invalid restaurant' });
        return;
    }
    await SavedItem_model_1.default.deleteOne({ userId: req.user?.id, restaurantId, dishId });
    res.json({ success: true });
});
exports.default = router;
