import { Router } from 'express'
import * as categoryController from '../controllers/Category.controller'
import upload from '../middlewares/multer.middleware'
import protect from '../middlewares/auth.middleware'
import authorizeRoles from '../middlewares/authorizeRoles'

const router = Router()

router.get('/categories', categoryController.getAllCategoriesWithDealCounts)
router.post(
  '/categories',
  protect,
  authorizeRoles('admin'),
  upload.single('image'),
  categoryController.createCategory
)
router.put(
  '/categories/:id',
  protect,
  authorizeRoles('admin'),
  upload.single('image'),
  categoryController.editCategory
)
router.delete('/categories/:id', protect, authorizeRoles('admin'), categoryController.deleteCategory)

export default router
