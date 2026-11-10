import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { frozenClock } from "../src/clock.js";
import { DomainError } from "../src/errors.js";
import { importPayments, type DbClient } from "../src/api/payment/import-service.js";
import { MAX_FILE_BYTES } from "../src/api/payment/validation.js";

const clock = frozenClock("2024-06-01");

const validCsv = Buffer.from(
  "payment_date,amount,type,contract_number\n2024-01-30,1000.00,incoming,101\n2024-01-31,500.00,outgoing,201\n",
);

function dbWithContracts(numbers: string[]): DbClient & { sqls: string[] } {
  const sqls: string[] = [];
  return {
    sqls,
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      sqls.push(sql);
      if (sql.includes("SELECT")) {
        const wanted = (params?.[0] as string[]) ?? [];
        return {
          rows: wanted
            .filter((number) => numbers.includes(number))
            .map((contract_number, index) => ({ id: index + 1, contract_number })),
        };
      }
      return { rows: [] };
    }),
  };
}

describe("importPayments", () => {
  it("inserts all rows in one transaction when valid", async () => {
    const db = dbWithContracts(["101", "201"]);
    await importPayments({ filename: "p.csv", buffer: validCsv }, db, clock);

    expect(db.sqls.some((sql) => sql === "BEGIN")).toBe(true);
    expect(db.sqls.some((sql) => sql.startsWith("INSERT INTO payment"))).toBe(true);
    expect(db.sqls.some((sql) => sql === "COMMIT")).toBe(true);
  });

  it("does not insert when a contract is missing", async () => {
    const db = dbWithContracts(["101"]);
    await expect(
      importPayments({ filename: "p.csv", buffer: validCsv }, db, clock),
    ).rejects.toMatchObject({
      errorCode: "CONTRACT_MISSING",
    });
    expect(db.sqls.some((sql) => sql.startsWith("INSERT"))).toBe(false);
  });

  it("does not insert mixed valid+invalid rows", async () => {
    const csv = Buffer.from(
      "payment_date,amount,type,contract_number\n2024-01-30,1000.00,incoming,101\n2024-01-31,-1,outgoing,201\n",
    );
    const db = dbWithContracts(["101", "201"]);

    await expect(importPayments({ filename: "p.csv", buffer: csv }, db, clock)).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(db.sqls.some((sql) => sql.startsWith("INSERT"))).toBe(false);
  });

  it("rejects empty and oversize files", async () => {
    const db = dbWithContracts([]);
    await expect(
      importPayments({ filename: "p.csv", buffer: Buffer.alloc(0) }, db, clock),
    ).rejects.toMatchObject({ errorCode: "FILE_EMPTY" });
    await expect(
      importPayments({ filename: "p.xml", buffer: Buffer.from("<payments></payments>") }, db, clock),
    ).rejects.toMatchObject({ errorCode: "FILE_EMPTY" });
    await expect(
      importPayments({ filename: "p.csv", buffer: Buffer.alloc(MAX_FILE_BYTES + 1) }, db, clock),
    ).rejects.toMatchObject({ errorCode: "FILE_TOO_LARGE" });
  });

  it("rejects a text file", async () => {
    const db = dbWithContracts([]);
    await expect(
      importPayments(
        { filename: "payments.txt", mimetype: "text/plain", buffer: readFileSync("examples/payments.txt") },
        db,
        clock,
      ),
    ).rejects.toMatchObject({ errorCode: "FILE_UNSUPPORTED" });
  });
});
