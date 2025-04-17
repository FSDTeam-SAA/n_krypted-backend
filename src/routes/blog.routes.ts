import { Router } from 'express'
import * as blogController from '../controllers/Blog.controller'
import upload from '../middlewares/multer.middleware'

const router = Router()

router.post('/', upload.single('image'), blogController.createBlog)
router.get('/', blogController.getBlogs)
router.get('/:id', blogController.getBlog)
router.put('/:id', upload.single('image'), blogController.updateBlog)
router.delete('/:id', blogController.deleteBlog)

export default router
