import express from "express"
import uploadDoctorRequestDocs from "../utils/uploadDoctorDocuments.js";
import { registerDoctorRequest, verifyDoctorRequest } from "../controllers/doctor.controller.js"
import { authenticateUser } from "../middlewares/auth.middleware.js";


const router = express.Router();

router.post('/', uploadDoctorRequestDocs, registerDoctorRequest);
router.put('/:requestId/verify', authenticateUser, verifyDoctorRequest);


export default router;
