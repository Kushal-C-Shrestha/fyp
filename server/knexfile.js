import dotenv from "dotenv";
dotenv.config();

const sslConfig = () => {
  if (process.env.USE_AWS === "true") {
    return { rejectUnauthorized: false };
  }

  return undefined;
};

const buildConnection = () => {
  if (process.env.USE_AWS === "true") {
    return {
      host: process.env.AWS_RDS_HOST,
      port: Number(process.env.AWS_RDS_PORT || 5432),
      database: process.env.AWS_RDS_DATABASE,
      user: process.env.AWS_RDS_USER,
      password: process.env.AWS_RDS_PASSWORD,
      ssl: sslConfig(),
    };
  }

  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "eswasthya",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
  };
};

const sharedConfig = {
  client: "pg",
  connection: buildConnection(),
  migrations: {
    directory: "./db/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./db/seeds",
  },
  pool: {
    min: 2,
    max: 10,
  },
};

export default {
  development: sharedConfig,
  production: sharedConfig,
};