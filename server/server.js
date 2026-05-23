import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectRedis } from "./src/config/redis.js";

connectRedis();

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server listening on port ${process.env.PORT || 5000}`);
});
