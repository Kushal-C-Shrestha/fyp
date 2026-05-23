import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import s3, { BUCKET } from "../config/s3.js";

const isAWS = process.env.USE_AWS === "true";

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads", "blogs");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const imageFileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.has(extension)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG, WEBP, and GIF files are allowed."), false);
  }
};

const buildLocalStorage = (subdirectory) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const destination = path.join(uploadsRoot, subdirectory);
      ensureDir(destination);
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path
        .basename(file.originalname, extension)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "image";
      cb(null, `${Date.now()}-${baseName}${extension}`);
    },
  });

const buildS3Storage = (subdirectory) =>
  multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path
        .basename(file.originalname, extension)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "image";
      cb(null, `blogs/${subdirectory}/${Date.now()}-${baseName}${extension}`);
    },
  });

const buildUploader = (subdirectory) =>
  multer({
    storage: isAWS ? buildS3Storage(subdirectory) : buildLocalStorage(subdirectory),
    fileFilter: imageFileFilter,
    limits: { fileSize: 6 * 1024 * 1024 },
  });

export const uploadBlogCoverImage = buildUploader("covers").single("coverImage");
export const uploadBlogInlineImage = buildUploader("inline").single("image");
