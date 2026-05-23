import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
        // Exponential back-off up to 3 s; stop after 6 attempts
        reconnectStrategy: (retries) => {
            if (retries >= 6) return false;
            return Math.min(retries * 200, 3000);
        },
    },
});

redisClient.on("error", (err) => {
    // Avoid log-spam on repeated connection failures
    if (!redisClient._lastLoggedError || redisClient._lastLoggedError !== err.code) {
        console.warn("[Redis] Error:", err.message);
        redisClient._lastLoggedError = err.code;
    }
});

redisClient.on("connect", () => {
    redisClient._lastLoggedError = null;
    console.log("[Redis] Connected");
});

redisClient.on("reconnecting", () => console.log("[Redis] Reconnecting..."));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.warn("[Redis] Could not connect on startup:", err.message);
        
    }
};

export default redisClient;
