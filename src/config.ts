import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export type Config = {
  port: number;
  databaseUrl: string;
};

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const portRaw = process.env.PORT?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL missing. Set it in .env (includes db password).");
  }
  if (!portRaw) {
    throw new Error("PORT missing. Set it in .env.");
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return { port, databaseUrl };
}
