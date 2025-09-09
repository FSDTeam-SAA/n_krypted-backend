import { Router } from 'express'
import * as blogController from '../controllers/Blog.controller'
import upload from '../middlewares/multer.middleware'

const router = Router()

router.post('/blog/', upload.single('image'), blogController.createBlog)
router.get('/blog', blogController.getBlogs)
router.get('/blog/:id', blogController.getBlog)
router.put('/blog/:id', upload.single('image'), blogController.updateBlog)
router.delete('/blog/:id', blogController.deleteBlog)

export default router
