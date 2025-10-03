"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BlogComment_controller_1 = require("../controllers/BlogComment.controller");
const router = (0, express_1.Router)();
router.post('/comments', BlogComment_controller_1.createComment);
router.get('/comments/:blogId', BlogComment_controller_1.getCommentsByBlog);
router.delete('/comments/:id', BlogComment_controller_1.deleteComment);
exports.default = router;
