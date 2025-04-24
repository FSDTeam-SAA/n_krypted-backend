import { Router } from 'express'
import * as categoryController from '../controllers/Category.controller'
import upload from '../middlewares/multer.middleware'

const router = Router()

router.get('/categories', categoryController.getAllCategories)
router.post(
  '/categories',
  upload.single('image'),
  categoryController.createCategory
)
router.put(
  '/categories/:id',
  upload.single('image'),
  categoryController.editCategory
)
router.delete('/categories/:id', categoryController.deleteCategory)

export default router
