import redisClient from "../config/redis.js";

const isReady = () => redisClient.isReady;

export const rateLimiter = ({
    prefix,
    max,
    windowSec,
    keyBy = "ip",
    message = "Too many requests. Please slow down and try again later.",
}) => async (req, res, next) => {
    if (!isReady()) return next();

    try {
        const rawIp = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
        const identifier =
            keyBy === "user" && req.user?.id
                ? `user:${req.user.id}`
                : `ip:${rawIp}`;

        const key = `rl:${prefix}:${identifier}`;
        const count = await redisClient.incr(key);

        if (count === 1) {
            await redisClient.expire(key, windowSec);
        }

        const ttl = await redisClient.ttl(key);
        const remaining = Math.max(0, max - count);

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", remaining);
        res.setHeader("X-RateLimit-Reset", Math.floor(Date.now() / 1000) + ttl);

        if (count > max) {
            return res.status(429).json({
                success: false,
                message,
                retryAfter: ttl > 0 ? ttl : windowSec,
            });
        }

        next();
    } catch (err) {
        console.warn("[RateLimit] Redis error — failing open:", err.message);
        next();
    }
};
