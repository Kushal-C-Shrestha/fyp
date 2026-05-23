import multer from "multer";
import multerS3 from "multer-s3";
import fs from "fs";
import path from "path";
import s3, { BUCKET } from "../config/s3.js";

const isAWS = process.env.USE_AWS === "true";
const allowedTypes = [".pdf", ".jpg", ".jpeg", ".png"];

const uploadDir = path.join("uploads", "hospital-requests");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const s3Storage = multerS3({
  s3,
  bucket: BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname));
    cb(null, `hospital-requests/${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    // Passing an error to the callback tells Multer to reject the file
    cb(new Error("Only PDF, JPG, JPEG, PNG files are allowed"), false);
  }
};

const uploadHospitalRequestDocs = multer({
  storage: isAWS ? s3Storage : localStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).fields([
  { name: "adminCitizenshipFront", maxCount: 1 },
  { name: "adminCitizenshipBack", maxCount: 1 },
  { name: "registrationCertificates", maxCount: 5 },
  { name: "taxClearanceDocs", maxCount: 5 },
  { name: "otherDocs", maxCount: 10 }
]);

export default uploadHospitalRequestDocs;
