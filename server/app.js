import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import routes from "./src/routes/index.js";
import cookieParser from "cookie-parser";
import initSockets from "./src/sockets/index.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGIN,
        credentials: true
    }
});

app.set("io", io);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
    exposedHeaders: ["x-session-id"],
    allowedHeaders: ["Content-Type", "Authorization", "x-session-id"]
}));

app.use('/api', routes);
app.use('/uploads', express.static('uploads'));

initSockets(io);

export { io };
export default server;