import * as chatbotService from "../services/chatbot.service.js";

const handleMessage = async (req, res) => {
    try {
        const sessionId = req.sessionId;
        const userId = req.user?.id ?? null;
        const message = (req.body?.message ?? "").trim();

        const result = await chatbotService.handleMessage(sessionId, userId, message);
        return res.json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
    }
};

const getMessages = async (req, res) => {
    try {
        const sessionId = req.sessionId;
        const result = await chatbotService.getMessages(sessionId);
        return res.json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
    }
};

export { handleMessage, getMessages };
