import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import fs from "fs";
import s3, { BUCKET } from "../config/s3.js";

const isAWS = process.env.USE_AWS === "true";

const allowedTypes = [".pdf", ".jpg", ".jpeg", ".png"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, JPEG, PNG files are allowed"), false);
  }
};

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const requestId = req.params?.requestId || "pending";
    const dir = `uploads/doctor-requests/${requestId}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const s3Storage = multerS3({
  s3,
  bucket: BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const requestId = req.params?.requestId || "pending";
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname));
    cb(null, `doctor-requests/${requestId}/${Date.now()}-${base}${ext}`);
  },
});

const uploadDoctorRequestDocs = multer({
  storage: isAWS ? s3Storage : localStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: "citizenshipFront", maxCount: 1 },
  { name: "citizenshipBack", maxCount: 1 },
  { name: "medicalLicenseCertificate", maxCount: 1 },
  { name: "degreeCertificate", maxCount: 1 },
  { name: "additionalCertificates", maxCount: 10 },
]);

export default uploadDoctorRequestDocs;
