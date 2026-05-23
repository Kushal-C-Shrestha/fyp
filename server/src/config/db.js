import pkg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Pool } = pkg;

const isAWS = process.env.USE_AWS === "true";

const sslConfig = () => {
    const sslValue = String(process.env.PGSSL || process.env.DB_SSL || "").trim().toLowerCase();
    if (isAWS || sslValue === "true" || sslValue === "require") {
        return { rejectUnauthorized: false };
    }
    return undefined;
};

const connectionConfig = () => {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: sslConfig(),
        };
    }

    if (isAWS) {
        return {
            host: process.env.AWS_RDS_HOST,
            user: process.env.AWS_RDS_USER,
            password: process.env.AWS_RDS_PASSWORD,
            port: Number(process.env.AWS_RDS_PORT) || 5432,
            database: process.env.AWS_RDS_DATABASE,
            ssl: sslConfig(),
        };
    }

    return {
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE,
        ssl: sslConfig(),
    };
};

const pool = new Pool(connectionConfig());

export default pool;
