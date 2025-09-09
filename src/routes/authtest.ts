import express from 'express'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'

const router = express.Router()

// Admin-only route
router.get('/admin/dashboard', protect, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin' })
})

// User or admin route
router.get('/profile', protect, authorizeRoles('user', 'admin'), (req: any, res) => {
  res.json({ message: `Welcome ${req.user?.role}` })
})
export default router