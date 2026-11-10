import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { frozenClock } from "../src/clock.js";
import type { DbClient } from "../src/api/payment/import-service.js";
import { MAX_FILE_BYTES } from "../src/api/payment/validation.js";

const clock = frozenClock("2024-06-01");
const csv = Buffer.from(
  "payment_date,amount,type,contract_number\n2024-01-30,1000.00,incoming,101\n",
);

function dbWithContract(): DbClient {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes("SELECT")) {
        return { rows: [{ id: 1, contract_number: "101" }] };
      }
      return { rows: [] };
    }),
  };
}

describe("POST /v1/payment/import", () => {
  it("accepts Postman-style binary body", async () => {
    const app = await buildApp(dbWithContract(), clock);
    const response = await app.inject({
      method: "POST",
      url: "/v1/payment/import",
      headers: { "content-type": "application/octet-stream" },
      payload: csv,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    await app.close();
  });

  it("accepts text/csv raw body", async () => {
    const app = await buildApp(dbWithContract(), clock);
    const response = await app.inject({
      method: "POST",
      url: "/v1/payment/import",
      headers: { "content-type": "text/csv" },
      payload: csv,
    });

    expect(response.statusCode).toBe(204);
    await app.close();
  });

  it("returns java-shaped error { message, timestamp }", async () => {
    const app = await buildApp(dbWithContract(), clock);
    const response = await app.inject({
      method: "POST",
      url: "/v1/payment/import",
      headers: { "content-type": "text/csv" },
      payload: Buffer.from(
        "payment_date,amount,type,contract_number\n2024-01-30,1000.00,incoming,999\n",
      ),
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["message", "timestamp"]);
    expect(body.message).toBe("CONTRACT_MISSING");
    expect(typeof body.timestamp).toBe("string");
    await app.close();
  });

  it("maps an oversized body to FILE_TOO_LARGE", async () => {
    const app = await buildApp(dbWithContract(), clock);
    const response = await app.inject({
      method: "POST",
      url: "/v1/payment/import",
      headers: { "content-type": "application/octet-stream" },
      payload: Buffer.alloc(MAX_FILE_BYTES + 1),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ message: "FILE_TOO_LARGE" });
    await app.close();
  });
});
