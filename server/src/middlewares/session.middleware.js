import pool from "../config/db.js";
import dotenv from "dotenv";
import crypto from "crypto";
import jwt from "jsonwebtoken";

dotenv.config();

export const sessionMiddleware = async (req, res, next) => {
    try {
        let userId = req.user?.id ?? null;
        
        if (!userId && req.headers['authorization']) {
            const authHeader = req.headers['authorization'];
            if (authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                    userId = decode.id;
                    req.user = { id: userId }; // Attach user info here
                } catch (err) {
                    console.error("JWT verification failed in sessionMiddleware:", err.message);
                    return res.status(401).json({
                        error: "Unauthorized",
                        message: err.name === "TokenExpiredError" ? "jwt expired" : "invalid token"
                    });
                }
            }
        }

        let sessionId = req.headers["x-session-id"];
        const expiresAtExpression = "NOW() + INTERVAL '30 days'";

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (sessionId && uuidRegex.test(sessionId)) {
            const result = await pool.query(
                `SELECT session_id, user_id, is_expired, expires_at
                 FROM assistant_sessions
                 WHERE session_id = $1
                 LIMIT 1`,
                [sessionId]
            );

            if (
                result.rows.length === 0 ||
                result.rows[0].is_expired === true ||
                (result.rows[0].expires_at && new Date(result.rows[0].expires_at) <= new Date()) ||
                (userId && result.rows[0].user_id !== userId) ||
                (!userId && result.rows[0].user_id !== null)
            ) {
                sessionId = null;
            } else {
                await pool.query(
                    `UPDATE assistant_sessions
                     SET last_active_at = NOW(),
                         expires_at = ${expiresAtExpression}
                     WHERE session_id = $1`,
                    [sessionId]
                );
                req.sessionId = sessionId;
                return next();
            }
        }

        if (userId) {
            const existing = await pool.query(
                `SELECT session_id
                 FROM assistant_sessions
                 WHERE user_id = $1 AND is_expired = false
                 ORDER BY last_active_at DESC NULLS LAST, created_at DESC
                 LIMIT 1`,
                [userId]
            );

            if (existing.rows.length > 0) {
                sessionId = existing.rows[0].session_id;
            } else {
                sessionId = crypto.randomUUID();
                await pool.query(
                    `INSERT INTO assistant_sessions (user_id, session_id, is_expired, expires_at, created_at, last_active_at)
                     VALUES ($1, $2, false, ${expiresAtExpression}, NOW(), NOW())`,
                    [userId, sessionId]
                );
            }
        } else {
            sessionId = crypto.randomUUID();
            await pool.query(
                `INSERT INTO assistant_sessions (user_id, session_id, is_expired, expires_at, created_at, last_active_at)
                 VALUES (NULL, $1, false, ${expiresAtExpression}, NOW(), NOW())`,
                [sessionId]
            );
        }

        res.setHeader("x-session-id", sessionId);
        req.sessionId = sessionId;
        return next();
    } catch (error) {
        console.error("Session middleware error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
