import { Router } from 'express'
import {
  createComment,
  getCommentsByBlog,
  deleteComment,
} from '../controllers/BlogComment.controller'

const router = Router()

router.post('/comments', createComment)
router.get('/comments/:blogId', getCommentsByBlog)
router.delete('/comments/:id', deleteComment)

export default router
