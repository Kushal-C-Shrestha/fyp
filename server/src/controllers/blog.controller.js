import * as blogService from "../services/blog.service.js";

export const deleteBlog = async (req, res) => {
  try {
    await blogService.deleteBlog({
      blogId: req.params.id,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to delete blog." });
  }
};

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

export const listPublicBlogs = async (req, res) => {
  try {
    const result = await blogService.listPublicBlogs({
      search: req.query?.search,
      tag: req.query?.tag,
      page: req.query?.page,
      limit: req.query?.limit,
      baseUrl: getBaseUrl(req),
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to load blogs." });
  }
};

export const getPublicBlog = async (req, res) => {
  try {
    const blog = await blogService.getPublicBlogBySlugOrId({
      slugOrId: req.params.slugOrId,
      baseUrl: getBaseUrl(req),
    });
    return res.status(200).json({ success: true, blog });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to load the blog." });
  }
};

export const listMyBlogs = async (req, res) => {
  try {
    const blogs = await blogService.listAuthorBlogs({
      authorId: req.user?.id,
      baseUrl: getBaseUrl(req),
    });
    return res.status(200).json({ success: true, blogs });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to load your blogs." });
  }
};

export const getMyBlog = async (req, res) => {
  try {
    const blog = await blogService.getAuthorBlog({
      blogId: req.params.id,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
      baseUrl: getBaseUrl(req),
    });
    return res.status(200).json({ success: true, blog });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to load your blog." });
  }
};

export const createBlog = async (req, res) => {
  try {
    const result = await blogService.createBlog({
      authorId: req.user?.id,
      payload: req.body || {},
      coverImageFile: req.file,
      baseUrl: getBaseUrl(req),
    });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to create blog." });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const result = await blogService.updateBlog({
      blogId: req.params.id,
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
      payload: req.body || {},
      coverImageFile: req.file,
      baseUrl: getBaseUrl(req),
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to update blog." });
  }
};

export const uploadInlineImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please attach an image." });
    }

    const url = blogService.buildInlineImageUrl(req.file, getBaseUrl(req));
    return res.status(201).json({ success: true, url });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to upload image." });
  }
};

export const listModerationBlogs = async (req, res) => {
  try {
    const blogs = await blogService.listModerationBlogs({
      status: req.query?.status,
      search: req.query?.search,
      baseUrl: getBaseUrl(req),
    });
    return res.status(200).json({ success: true, blogs });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to load moderation queue." });
  }
};

export const reviewBlog = async (req, res) => {
  try {
    const result = await blogService.reviewBlog({
      blogId: req.params.id,
      reviewerId: req.user?.id,
      reviewerRole: req.user?.role,
      status: req.body?.status,
      notes: req.body?.notes,
      baseUrl: getBaseUrl(req),
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to review blog." });
  }
};

export const getBlogStats = async (_req, res) => {
  try {
    const stats = await blogService.getBlogStats();
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    return res.status(error?.status || 500).json({ success: false, message: error?.message || "Unable to load blog stats." });
  }
};
