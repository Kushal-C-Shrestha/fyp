import express from "express";
import {
  createBlog,
  deleteBlog,
  getBlogStats,
  getMyBlog,
  getPublicBlog,
  listModerationBlogs,
  listMyBlogs,
  listPublicBlogs,
  reviewBlog,
  updateBlog,
  uploadInlineImage,
} from "../controllers/blog.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { uploadBlogCoverImage, uploadBlogInlineImage } from "../utils/uploadBlogImages.js";
import { cache } from "../middlewares/cache.middleware.js";

const router = express.Router();

router.get("/", cache(180, "blogs"), listPublicBlogs);
router.get("/me", authenticateUser, listMyBlogs);
router.get("/me/:id", authenticateUser, getMyBlog);
router.post("/images", authenticateUser, uploadBlogInlineImage, uploadInlineImage);
router.post("/", authenticateUser, uploadBlogCoverImage, createBlog);
router.patch("/:id", authenticateUser, uploadBlogCoverImage, updateBlog);
router.delete("/:id", authenticateUser, deleteBlog);

router.get("/admin/stats", authenticateUser, getBlogStats);
router.get("/admin/moderation", authenticateUser, listModerationBlogs);
router.patch("/admin/:id/review", authenticateUser, reviewBlog);

router.get("/:slugOrId", cache(600, "blogs"), getPublicBlog);

export default router;
