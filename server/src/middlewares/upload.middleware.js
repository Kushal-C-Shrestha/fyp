import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import s3, { BUCKET } from "../config/s3.js";

const isAWS = process.env.USE_AWS === "true";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const baseUploadDir = path.join(__dirname, "..", "..", "uploads");

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`), false);
  }
};

const createLocalStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(baseUploadDir, folder);
      ensureDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

const createS3Storage = (folder) =>
  multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, path.extname(file.originalname));
      cb(null, `${folder}/${Date.now()}-${base}${ext}`);
    },
  });

const createUpload = ({ folder = "", fileSize = 5 * 1024 * 1024 } = {}) =>
  multer({
    storage: isAWS ? createS3Storage(folder) : createLocalStorage(folder),
    fileFilter,
    limits: { fileSize },
  });

export default createUpload;