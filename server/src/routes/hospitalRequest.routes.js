import express from "express"
import uploadHospitalRequestDocs from "../utils/uploadHospitalDocuments.js";
import { getHospitalRequests, registerHospitalRequest, verifyHospitalRequest } from "../controllers/hospital.controller.js"
import { authenticateUser } from "../middlewares/auth.middleware.js";


const router = express.Router();

router.get('/', getHospitalRequests)
router.post('/', uploadHospitalRequestDocs, registerHospitalRequest)
router.put('/:id/verify', authenticateUser,  verifyHospitalRequest)

export default router;
