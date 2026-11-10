import pg from "pg";

import { buildApp } from "./app.js";
import { systemClock } from "./clock.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const client = new pg.Client({ connectionString: config.databaseUrl });
await client.connect();

const app = await buildApp(client, systemClock());
await app.listen({ port: config.port, host: "0.0.0.0" });
