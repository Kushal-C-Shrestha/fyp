import express from "express";
import multer from "multer";
import createUpload from "../middlewares/upload.middleware.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
    handleFileUpload,
    getUserRecords,
    renameRecord,
    deleteRecord,
    viewRecord,
} from "../controllers/record.controller.js";

const router = express.Router();

const upload = createUpload({
    folder: "private/patients/medical-records",
    allowedTypes: [".pdf"],
    fileSize: 10 * 1024 * 1024,
});

const uploadSingle = (req, res, next) => {
    req.setTimeout(120000);
    res.setTimeout(120000);

    upload.single("medicalRecord")(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ success: false, message: "File is too large. Maximum size is 10 MB." });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        return res.status(400).json({ success: false, message: err.message || "File upload failed." });
    });
};

router.get("/", authenticateUser, getUserRecords);
router.get("/view/:id", authenticateUser, viewRecord);
router.post("/", authenticateUser, uploadSingle, handleFileUpload);
router.put("/:id", authenticateUser, renameRecord);
router.delete("/:id", authenticateUser, deleteRecord);

export default router;
