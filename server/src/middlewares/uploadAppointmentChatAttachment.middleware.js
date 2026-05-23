import fs from "fs";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import s3, { BUCKET } from "../config/s3.js";

const isAWS = process.env.USE_AWS === "true";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
    ".pdf", ".png", ".jpg", ".jpeg", ".webp",
    ".gif", ".txt", ".csv", ".doc", ".docx",
    ".xls", ".xlsx", ".zip",
]);

const sanitizeFileName = (value = "attachment") =>
    String(value || "attachment")
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
        .replace(/\s+/g, " ")
        .slice(0, 120) || "attachment";

const fileFilter = (_req, file, cb) => {
    const extension = path.extname(String(file.originalname || "")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
        cb(new Error("Unsupported file type. Upload a PDF, image, text, Word, Excel, CSV, or ZIP file."), false);
        return;
    }
    cb(null, true);
};

const localStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const normalizedAppointmentId = Number.parseInt(req.params?.appointmentId, 10);
        const folderName = Number.isInteger(normalizedAppointmentId) ? String(normalizedAppointmentId) : "general";
        const dir = path.join(process.cwd(), "uploads", "appointment-chat", folderName);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const extension = path.extname(String(file.originalname || "")).toLowerCase();
        const basename = path.basename(String(file.originalname || "attachment"), extension);
        const safeBasename = sanitizeFileName(basename).replace(/\s+/g, "-");
        cb(null, `${Date.now()}-${safeBasename || "attachment"}${extension}`);
    },
});

const s3Storage = multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
        const normalizedAppointmentId = Number.parseInt(req.params?.appointmentId, 10);
        const folderName = Number.isInteger(normalizedAppointmentId) ? String(normalizedAppointmentId) : "general";
        const extension = path.extname(String(file.originalname || "")).toLowerCase();
        const basename = path.basename(String(file.originalname || "attachment"), extension);
        const safeBasename = sanitizeFileName(basename).replace(/\s+/g, "-");
        cb(null, `appointment-chat/${folderName}/${Date.now()}-${safeBasename || "attachment"}${extension}`);
    },
});

const uploadAppointmentChatAttachment = multer({
    storage: isAWS ? s3Storage : localStorage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1,
    },
});

export default uploadAppointmentChatAttachment;
