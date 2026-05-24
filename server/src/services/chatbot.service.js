import pool from "../config/db.js";
import { runAgent } from "../llm/agent.js";
import {
    getMemory,
    clearMemory,
    compressHistoryMessage,
    mergeEntityMemory,
    buildEntityContext,
    getEntityMemory,
} from "../llm/memory.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";


const getCleanErrorMessage = (err) => {
    if (!err) return "Internal engine failure.";
    const message = err.message || String(err);
    if (message.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(message);
            if (parsed.error?.message) {
                return parsed.error.message;
            }
        } catch (e) {
            // ignore
        }
    }
    return message;
};

const getHeaderValue = (headers, key) => {
    if (!headers) return "";
    if (typeof headers.get === "function") return headers.get(key) || "";
    return headers[key] || headers[key.toLowerCase()] || "";
};

const logLlmRateLimit = (err) => {
    const is429 =
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.constructor?.name === "RateLimitError";

    if (!is429) return;

    const detail = err?.error?.error || err?.error || {};
    console.warn("[LLM_RATE_LIMIT]", {
        provider: process.env.LLM_PROVIDER || "auto",
        model: process.env.GROQ_LLM_MODEL || process.env.GOOGLE_LLM_MODEL || process.env.OLLAMA_MODEL || "unknown",
        status: err?.status || 429,
        type: detail?.type || "",
        code: detail?.code || "",
        retryAfter: getHeaderValue(err?.headers, "retry-after"),
        limitRequests: getHeaderValue(err?.headers, "x-ratelimit-limit-requests"),
        remainingRequests: getHeaderValue(err?.headers, "x-ratelimit-remaining-requests"),
        resetRequests: getHeaderValue(err?.headers, "x-ratelimit-reset-requests"),
        limitTokens: getHeaderValue(err?.headers, "x-ratelimit-limit-tokens"),
        remainingTokens: getHeaderValue(err?.headers, "x-ratelimit-remaining-tokens"),
        resetTokens: getHeaderValue(err?.headers, "x-ratelimit-reset-tokens"),
        message: detail?.message || getCleanErrorMessage(err),
    });
};

export const handleMessage = async (sessionId, userId, message) => {
    if (!message || message.length === 0) {
        const error = new Error("Message is required.");
        error.status = 400;
        throw error;
    }

    let assistantSessionId = null;
    let assistantMsgId = null;

    try {
        const sessionRes = await pool.query(
            `SELECT id FROM assistant_sessions WHERE session_id = $1`,
            [sessionId]
        );

        if (sessionRes.rows.length === 0) {
            const error = new Error("Session not found.");
            error.status = 404;
            throw error;
        }

        assistantSessionId = sessionRes.rows[0].id;

        await pool.query(
            `INSERT INTO assistant_messages (assistant_session_id, sender_type, message, created_at)
             VALUES ($1, 'user', $2, NOW())`,
            [assistantSessionId, message]
        );

        // Ger memory from db 
        const memory = getMemory(sessionId);
        let chatHistory = await memory.chatHistory.getMessages();

        if (chatHistory.length === 0) {
            const historyRes = await pool.query(
                `SELECT sender_type, message, metadata
                 FROM assistant_messages
                 WHERE assistant_session_id = $1
                 ORDER BY created_at DESC
                 LIMIT 6`,
                [assistantSessionId]
            );
            historyRes.rows.reverse();

            for (const row of historyRes.rows) {
                if (row.metadata) {
                    mergeEntityMemory(sessionId, row.metadata);
                }
                // Skip intermediate agent traces so they don't pollute history
                if (
                    row.message.includes("Thought:") ||
                    row.message.includes("Action:") ||
                    row.message.includes("Observation:") ||
                    row.message === "Thinking..." ||
                    row.message.startsWith("Classifying intent...") ||
                    row.message.startsWith("Thinking (Intent:")
                ) {
                    continue;
                }
                if (row.sender_type === "user") {
                    await memory.chatHistory.addMessage(new HumanMessage(row.message));
                } else {
                    await memory.chatHistory.addMessage(new AIMessage(row.message));
                }
            }
            chatHistory = await memory.chatHistory.getMessages();
        }

        // Build user/context info for the agent
        const now = new Date();
        let context = "User is not logged in.";
        if (userId) {
            const { rows: userRows } = await pool.query(
                `SELECT full_name, role FROM users WHERE id = $1`,
                [userId]
            );
            if (userRows.length > 0) {
                context = `Current User: ${userRows[0].full_name} (ID: ${userId}, Role: ${userRows[0].role})`;
            }
        }

        const nepalTimeStr = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kathmandu",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(now);
        const year = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric" }).format(now);
        const month = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", month: "2-digit" }).format(now);
        const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", day: "2-digit" }).format(now);
        const dayName = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", weekday: "long" }).format(now);
        const dateStr = `${year}-${month}-${day}`;

        context += `\nToday is ${nepalTimeStr} (Nepal Time). The current date is ${dateStr}. When calculating relative dates like "today", "tomorrow", "this Friday", "next Monday", etc., you MUST use this current date (${dateStr}, which is a ${dayName}) as the absolute reference. Never assume any other year, month, or day. Ensure that any appointments you book or check availability for are scheduled for a future date and time starting from ${nepalTimeStr}.`;

        // Pre-extract any entity IDs mentioned explicitly in the message to help the agent skip unnecessary searches
        const doctorIdMatch =
            message.match(/(?:doctor|dr\.?)\s+[^(]*\(ID:\s*(\d+)\)/i) ||
            message.match(/\b(?:doctor|dr\.?)\s+#?\s*(\d+)\b/i) ||
            message.match(/\(ID:\s*(\d+)\)/i);
        const hospitalIdMatch = message.match(/hospital[^(]*\(ID:\s*(\d+)\)/i);
        const patientIdHint = userId ? `The current patient's ID is ${userId}.` : "";
        const entityHints = [];
        if (doctorIdMatch) entityHints.push(`The doctor ID mentioned in the user message is: ${doctorIdMatch[1]}. Use this directly - do NOT search for the doctor.`);
        if (hospitalIdMatch) entityHints.push(`The hospital ID mentioned in the user message is: ${hospitalIdMatch[1]}.`);
        if (patientIdHint) entityHints.push(patientIdHint);

        const rememberedDoctors = getEntityMemory(sessionId).doctors || [];
        const normalizedMessage = message.toLowerCase();
        const matchingDoctor = rememberedDoctors.find((doctor) => {
            const nameParts = String(doctor.name || "")
                .toLowerCase()
                .split(/\s+/)
                .filter((part) => part.length >= 3);
            return nameParts.length > 0 && nameParts.every((part) => normalizedMessage.includes(part));
        });
        if (!doctorIdMatch && matchingDoctor) {
            entityHints.push(
                `The user appears to be referring to ${matchingDoctor.name}: doctor ID ${matchingDoctor.id}${matchingDoctor.hospitalId ? `, hospital ID ${matchingDoctor.hospitalId}` : ""}. Use this directly instead of searching again.`
            );
        }
        if (entityHints.length > 0) {
            context += `\nExtracted from user message: ${entityHints.join(" ")}`;
        }

        const entityContext = buildEntityContext(sessionId);
        if (entityContext) {
            context += `\n\n${entityContext}\nUse these recent doctor and hospital IDs directly when the user's follow-up refers to a listed doctor by name or asks about already shown availability. Do not search again just to recover an ID that is listed here.`;
        }


        let assistantText = "";
        let assistantMetadata = {};

        try {
            const agentResult = await runAgent(sessionId, message, context);
            assistantText = typeof agentResult === "string" ? agentResult : agentResult.message;
            assistantMetadata = typeof agentResult === "string" ? {} : (agentResult.metadata || {});
            mergeEntityMemory(sessionId, assistantMetadata);
        } catch (agentErr) {
            logLlmRateLimit(agentErr);


            const is429 =
                agentErr?.status === 429 ||
                agentErr?.message?.includes("429") ||
                agentErr?.constructor?.name === "RateLimitError";

            const cleanDetail = getCleanErrorMessage(agentErr);
            const fallback = is429
                ? "I'm getting too many requests right now. Please wait a few seconds and try again."
                : `Sorry, I ran into an error during processing.\n\nDetail: ${cleanDetail}\n\nPlease check your server console log.`;

            if (assistantMsgId) {
                await pool.query(
                    `UPDATE assistant_messages SET message = $1, created_at = NOW() WHERE id = $2`,
                    [fallback, assistantMsgId]
                );
            } else {
                const insertRes = await pool.query(
                    `INSERT INTO assistant_messages (assistant_session_id, sender_type, message, created_at)
                     VALUES ($1, 'assistant', $2, NOW()) RETURNING id`,
                    [assistantSessionId, fallback]
                );
                assistantMsgId = insertRes.rows[0].id;
            }
            await pool.query(
                `UPDATE assistant_sessions SET last_active_at = NOW() WHERE session_id = $1`,
                [sessionId]
            );
            return { sessionId, message: fallback };
        }



        // Persist to in-memory LangChain history
        const activeMemory = getMemory(sessionId);
        await activeMemory.chatHistory.addMessage(new HumanMessage(message));
        await activeMemory.chatHistory.addMessage(new AIMessage(assistantText));

        if (assistantMsgId) {
            await pool.query(
                `UPDATE assistant_messages SET message = $1, metadata = $2, created_at = NOW() WHERE id = $3`,
                [assistantText, JSON.stringify(assistantMetadata), assistantMsgId]
            );
        } else {
            await pool.query(
                `INSERT INTO assistant_messages (assistant_session_id, sender_type, message, metadata, created_at)
                 VALUES ($1, 'assistant', $2, $3, NOW())`,
                [assistantSessionId, assistantText, JSON.stringify(assistantMetadata)]
            );
        }

        await pool.query(
            `UPDATE assistant_sessions SET last_active_at = NOW() WHERE session_id = $1`,
            [sessionId]
        );

        return { sessionId, message: assistantText };

    } catch (error) {
        logLlmRateLimit(error);

        const is429 =
            error?.status === 429 ||
            error?.message?.includes("429") ||
            error?.constructor?.name === "RateLimitError";

        const cleanDetail = getCleanErrorMessage(error);
        const fallback = is429
            ? "I'm getting too many requests right now. Please wait a few seconds and try again."
            : `Sorry, I ran into an error during processing.\n\nDetail: ${cleanDetail}\n\nPlease check your server console log.`;

        try {
            if (assistantMsgId) {
                await pool.query(
                    `UPDATE assistant_messages SET message = $1, created_at = NOW() WHERE id = $2`,
                    [fallback, assistantMsgId]
                );
            } else if (assistantSessionId) {
                await pool.query(
                    `INSERT INTO assistant_messages (assistant_session_id, sender_type, message, created_at)
                     VALUES ($1, 'assistant', $2, NOW())`,
                    [assistantSessionId, fallback]
                );
            }
            await pool.query(
                `UPDATE assistant_sessions SET last_active_at = NOW() WHERE session_id = $1`,
                [sessionId]
            );
        } catch (dbErr) {
            console.error("Failed to write error fallback to database:", dbErr);
        }

        return { sessionId, message: fallback };
    }
};

export const getMessages = async (sessionId) => {
    const MESSAGE_LIMIT = 50;
    try {
        const result = await pool.query(
            `SELECT am.id, am.sender_type as role, am.message as content, am.created_at
             FROM assistant_messages am
             JOIN assistant_sessions as_on ON am.assistant_session_id = as_on.id
             WHERE as_on.session_id = $1
               AND am.message <> 'Thinking...'
               AND am.message NOT LIKE 'Classifying intent...%'
               AND am.message NOT LIKE 'Thinking (Intent:%'
               AND am.message NOT LIKE 'Thought:%'
               AND am.message NOT LIKE 'Action:%'
             ORDER BY am.created_at DESC
             LIMIT $2`,
            [sessionId, MESSAGE_LIMIT]
        );

        return {
            sessionId,
            messages: result.rows.reverse(),
        };
    } catch (err) {
        console.error("getMessages error:", err);
        const error = new Error("Internal server error.");
        error.status = 500;
        throw error;
    }
};

export const deleteSession = async (sessionId) => {
    try {
        clearMemory(sessionId);

        await pool.query(
            `UPDATE assistant_sessions 
             SET is_expired = true, last_active_at = NOW()
             WHERE session_id = $1`,
            [sessionId]
        );

        return { message: "Session cleared." };
    } catch (err) {
        console.error("deleteSession error:", err);
        const error = new Error("Failed to delete session.");
        error.status = 500;
        throw error;
    }
};
