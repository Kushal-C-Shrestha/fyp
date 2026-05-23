import express from "express";
import { sessionMiddleware } from "../middlewares/session.middleware.js";
import { handleMessage, getMessages } from "../controllers/chatbot.controller.js";

const router = express.Router();

router.get('/message', sessionMiddleware, getMessages)
router.post('/message', sessionMiddleware, handleMessage)

export default router;
