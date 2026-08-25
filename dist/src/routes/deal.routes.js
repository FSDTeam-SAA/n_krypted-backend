"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealController = __importStar(require("../controllers/Deal.controller"));
const multer_middleware_1 = __importDefault(require("../middlewares/multer.middleware"));
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const restaurantController = __importStar(require("../controllers/RestaurantManagement.controller"));
const router = (0, express_1.Router)();
router.get('/manage/deals', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), restaurantController.getManagedRestaurants);
router.get('/manage/deals/:id', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), restaurantController.getManagedRestaurant);
router.get('/owner/restaurant', auth_middleware_1.default, (0, authorizeRoles_1.default)('restaurant_owner'), restaurantController.getMyRestaurant);
router.post('/owner/restaurant', auth_middleware_1.default, (0, authorizeRoles_1.default)('restaurant_owner'), restaurantController.createOwnerRestaurant);
router.put('/owner/restaurant/:id', auth_middleware_1.default, (0, authorizeRoles_1.default)('restaurant_owner'), restaurantController.resubmitOwnerRestaurant);
router.post('/admin/restaurants', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), restaurantController.createAdminRestaurant);
router.put('/admin/restaurants/:id', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), restaurantController.updateAdminRestaurant);
router.patch('/admin/restaurants/:id/approval', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), restaurantController.updateRestaurantApproval);
router.post('/restaurants/:id/dishes', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), restaurantController.createDish);
router.put('/restaurants/:id/dishes/:dishId', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), restaurantController.updateDish);
router.delete('/restaurants/:id/dishes/:dishId', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin', 'restaurant_owner'), restaurantController.deleteDish);
// Create a new deal
router.post('/deals', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), multer_middleware_1.default.array('images'), dealController.createDeal);
// Get all deals
router.get('/deals', dealController.getAllDeals);
router.get("/deals/popular", dealController.getPopularDeals);
// Get single deal
router.get('/deals/:id', dealController.getSingleDeal);
// Update a deal
router.patch('/deals/:id', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), multer_middleware_1.default.array('images'), dealController.updateDeal);
// Delete a deal
router.delete('/deals/bulk', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), dealController.bulkDeleteDeals);
router.delete('/deals/:id', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), dealController.deleteDeal);
// Change deal status
router.patch('/deals/:id/status', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), dealController.changeDealStatus);
// timer toggle
router.patch('/deals/:id/timer', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), dealController.toggleTimer);
// popular deals toggle
router.patch('/deals/:id/popular', auth_middleware_1.default, (0, authorizeRoles_1.default)('admin'), dealController.togglePopularDeals);
exports.default = router;
