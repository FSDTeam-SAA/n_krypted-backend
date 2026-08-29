import { Router } from 'express'
import asyncHandler from '../utils/asyncHandler'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'
import {
  createCheckIn,
  getAdminCheckIns,
  getMyCheckIns,
  getOwnerCheckIns,
  getUserCheckIns,
} from '../controllers/CheckIn.controller'

const router = Router()

router.post('/check-ins', protect, authorizeRoles('user'), asyncHandler(createCheckIn))
router.get('/check-ins/my', protect, authorizeRoles('user'), asyncHandler(getMyCheckIns))
router.get('/check-ins/admin', protect, authorizeRoles('admin'), asyncHandler(getAdminCheckIns))
router.get('/check-ins/owner', protect, authorizeRoles('restaurant_owner'), asyncHandler(getOwnerCheckIns))
router.get('/check-ins/user/:userId', protect, authorizeRoles('admin'), asyncHandler(getUserCheckIns))

export default router
