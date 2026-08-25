"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Auth_controller_1 = require("../controllers/Auth.controller");
const auth_middleware_1 = __importDefault(require("../middlewares/auth.middleware"));
const multer_middleware_1 = __importDefault(require("../middlewares/multer.middleware"));
const authorizeRoles_1 = __importDefault(require("../middlewares/authorizeRoles"));
const router = express_1.default.Router();
// User Registration
router.post("/register", Auth_controller_1.register);
// User Login
router.post("/login", Auth_controller_1.login);
// Forgot Password
router.post("/forgot-password", Auth_controller_1.forgotPassword);
// Verify Code
router.post("/verify", Auth_controller_1.verifyCode);
// Reset Password
router.post("/reset-password", Auth_controller_1.resetPassword);
// Change Password (Protected Route)
router.post("/change-password", Auth_controller_1.changePassword);
// Update User Information (Protected Route)
router.put("/update-profile", multer_middleware_1.default.single("avatar"), Auth_controller_1.updateUser);
// get a single user by id
router.get("/single-user/:id", Auth_controller_1.getUserById);
router.get("/all/user", auth_middleware_1.default, (0, authorizeRoles_1.default)("admin"), Auth_controller_1.getAllUser);
router.get("/restaurant-owners", auth_middleware_1.default, (0, authorizeRoles_1.default)("admin"), Auth_controller_1.getRestaurantOwners);
router.post("/restaurant-owners", auth_middleware_1.default, (0, authorizeRoles_1.default)("admin"), Auth_controller_1.createRestaurantOwner);
router.put("/restaurant-owners/:id", auth_middleware_1.default, (0, authorizeRoles_1.default)("admin"), Auth_controller_1.updateRestaurantOwner);
router.delete("/delete/user", auth_middleware_1.default, (0, authorizeRoles_1.default)("admin"), Auth_controller_1.deleteUser);
router.delete("/delete/users", auth_middleware_1.default, (0, authorizeRoles_1.default)("admin"), Auth_controller_1.bulkDeleteUsers);
router.post("/resend-verification", Auth_controller_1.resendVerification);
exports.default = router;
