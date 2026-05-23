import express from "express";
import { getAllSpecialities } from "../controllers/speciality.controller.js";
import { cache } from "../middlewares/cache.middleware.js";

const router = express.Router();

router.get('/', cache(3600, "specialities"), getAllSpecialities);

export default router;
