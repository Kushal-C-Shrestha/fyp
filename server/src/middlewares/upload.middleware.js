import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import fs from "fs";
import s3, { BUCKET } from "../config/s3.js";

const isAWS = process.env.USE_AWS === "true";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const baseUploadDir = "uploads";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

const normalizeAllowedTypes = (allowedTypes) => {
  const source = Array.isArray(allowedTypes) && allowedTypes.length > 0
    ? allowedTypes
    : ALLOWED_EXTENSIONS;

  return source.map((ext) => String(ext || "").trim().toLowerCase()).filter(Boolean);
};

const buildFileFilter = (allowedTypes) => {
  const normalizedAllowedTypes = normalizeAllowedTypes(allowedTypes);

  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (normalizedAllowedTypes.includes(ext)) {
      cb(null, true);
      return;
    }

    cb(new Error(`Invalid file type. Allowed: ${normalizedAllowedTypes.join(", ")}`), false);
  };
};

const resolveFolder = (folder, req, file) => {
  const resolved = typeof folder === "function" ? folder(req, file) : folder;
  return String(resolved || "").replace(/^[/\\]+/, "").replace(/\\/g, "/");
};

const buildUploadFileName = (file) => `${Date.now()}-${file.originalname}`;

const createLocalStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(baseUploadDir, resolveFolder(folder, req, file));
      ensureDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      cb(null, buildUploadFileName(file));
    },
  });

const createS3Storage = (folder) =>
  multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const resolvedFolder = resolveFolder(folder, req, file);
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, path.extname(file.originalname));
      const fileName = `${Date.now()}-${base}${ext}`;
      cb(null, resolvedFolder ? `${resolvedFolder}/${fileName}` : fileName);
    },
  });

const createUpload = ({
  folder = "",
  fileSize = 5 * 1024 * 1024,
  allowedTypes = ALLOWED_EXTENSIONS,
  limits = {},
} = {}) =>
  multer({
    storage: isAWS ? createS3Storage(folder) : createLocalStorage(folder),
    fileFilter: buildFileFilter(allowedTypes),
    limits: { fileSize, ...limits },
  });

export default createUpload;
