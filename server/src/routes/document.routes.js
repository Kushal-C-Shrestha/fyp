import express from "express";
import { viewVerificationDocument } from "../controllers/document.controller.js";

const router = express.Router();

router.get("/verification/:id/view", viewVerificationDocument);

export default router;
