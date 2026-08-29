import express from "express";
import {
  register,
  login,
  forgotPassword,
  verifyCode,
  resetPassword,
  changePassword,
  updateUser,
  getUserById,
  getAllUser,
  getRestaurantOwners,
  createRestaurantOwner,
  updateRestaurantOwner,
  deleteUser,
  bulkDeleteUsers,
  resendVerification,
} from "../controllers/Auth.controller";
import protect from "../middlewares/auth.middleware";
import upload from "../middlewares/multer.middleware";
import authorizeRoles from "../middlewares/authorizeRoles";

const router = express.Router();

// User Registration
router.post("/register", register);

// User Login
router.post("/login", login);

// Forgot Password
router.post("/forgot-password", forgotPassword);

// Verify Code
router.post("/verify", verifyCode);

// Reset Password
router.post("/reset-password", resetPassword);

// Change Password (Protected Route)
router.post("/change-password", protect, changePassword);

// Update User Information (Protected Route)
router.put("/update-profile", protect, upload.single("avatar"), updateUser);

// get a single user by id
router.get("/single-user/:id", protect, getUserById);

router.get("/all/user", protect, authorizeRoles("admin"), getAllUser);

router.get(
  "/restaurant-owners",
  protect,
  authorizeRoles("admin"),
  getRestaurantOwners
);
router.post(
  "/restaurant-owners",
  protect,
  authorizeRoles("admin"),
  createRestaurantOwner
);
router.put(
  "/restaurant-owners/:id",
  protect,
  authorizeRoles("admin"),
  updateRestaurantOwner
);
router.delete("/delete/user", protect, authorizeRoles("admin"), deleteUser);

router.delete(
  "/delete/users",
  protect,
  authorizeRoles("admin"),
  bulkDeleteUsers
);

router.post("/resend-verification", resendVerification);
export default router;
