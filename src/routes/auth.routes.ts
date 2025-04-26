import express from 'express'
import {
  register,
  login,
  forgotPassword,
  verifyCode,
  resetPassword,
  changePassword,
} from '../controllers/Auth.controller'
import protect from '../middlewares/auth.middleware'

const router = express.Router()

// User Registration
router.post('/register', register)

// User Login
router.post('/login', login)

// Forgot Password
router.post('/forgot-password', forgotPassword)

// Verify Code
router.post('/verify', verifyCode)

// Reset Password
router.post('/reset-password', resetPassword)

// Change Password (Protected Route)
router.post('/change-password',  changePassword)

export default router
