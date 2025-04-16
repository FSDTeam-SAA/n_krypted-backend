import express from 'express'
import { register, login, forgotPassword } from '../controllers/Auth.controller'

const router = express.Router()

// User Registration
router.post('/register', register)

// User Login
router.post('/login', login)

// Forgot Password
router.post('/forgot-password', forgotPassword)

export default router
