import redisClient from "../config/redis.js";

const isReady = () => redisClient.isReady;

export const cache = (ttlSeconds = 300, ns = "route") => async (req, res, next) => {
    if (!isReady()) return next();

    const key = `cache:${ns}:${req.method}:${req.originalUrl}`;

    try {
        const hit = await redisClient.get(key);
        if (hit) {
            res.setHeader("X-Cache", "HIT");
            return res.json(JSON.parse(hit));
        }
    } catch {
        return next();
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (isReady() && res.statusCode >= 200 && res.statusCode < 300) {
            redisClient.setEx(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
        }
        return originalJson(body);
    };

    res.setHeader("X-Cache", "MISS");
    next();
};

export const bustCache = async (ns) => {
    if (!isReady()) return;
    try {
        let cursor = 0;
        const pattern = `cache:${ns}:*`;
        do {
            const { cursor: next, keys } = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100,
            });
            cursor = next;
            if (keys.length > 0) await redisClient.del(keys);
        } while (cursor !== 0);
    } catch (err) {
        console.warn("[Cache] bustCache error:", err.message);
    }
};
