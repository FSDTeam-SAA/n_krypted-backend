import express from 'express'
import {
  register,
  login,
  forgotPassword,
  verifyCode,
  resetPassword,
} from '../controllers/Auth.controller'

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

export default router
