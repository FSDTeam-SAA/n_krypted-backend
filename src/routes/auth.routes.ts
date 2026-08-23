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
router.post("/change-password", changePassword);

// Update User Information (Protected Route)
router.put("/update-profile", upload.single("avatar"), updateUser);

// get a single user by id
router.get("/single-user/:id", getUserById);

router.get("/all/user", protect, authorizeRoles("admin"), getAllUser);

router.delete("/delete/user", protect, authorizeRoles("admin"), deleteUser);

router.delete(
  "/delete/users",
  protect,
  authorizeRoles("admin"),
  bulkDeleteUsers
);

router.post("/resend-verification", resendVerification);
export default router;
