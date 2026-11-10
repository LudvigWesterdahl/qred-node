import { describe, expect, it } from "vitest";

import { frozenClock } from "../src/clock.js";
import {
  MAX_FILE_BYTES,
  validateAmount,
  validateDate,
  validateRow,
  validateType,
} from "../src/api/payment/validation.js";
import type { ParsedPayment } from "../src/api/payment/parsers/types.js";

const clock = frozenClock("2024-06-01");

function row(overrides: Partial<ParsedPayment> = {}): ParsedPayment {
  return {
    row: 1,
    paymentDate: "2024-01-30",
    amount: "1000.00",
    type: "incoming",
    contractNumber: "101",
    ...overrides,
  };
}

describe("validateAmount", () => {
  it("accepts 1.10, 1.1, 1", () => {
    expect(validateAmount("1.10")).toBeUndefined();
    expect(validateAmount("1.1")).toBeUndefined();
    expect(validateAmount("1")).toBeUndefined();
  });

  it("trims spaces", () => {
    expect(validateAmount("  1.10  ")).toBeUndefined();
  });

  it("rejects 0 and negative", () => {
    expect(validateAmount("0")).toBe("AMOUNT_NON_POSITIVE");
    expect(validateAmount("0.00")).toBe("AMOUNT_NON_POSITIVE");
    expect(validateAmount("-1.00")).toBe("AMOUNT_NON_POSITIVE");
  });

  it("rejects too many decimals", () => {
    expect(validateAmount("0.001")).toBe("AMOUNT_TOO_MANY_DECIMALS");
    expect(validateAmount("1.100")).toBe("AMOUNT_TOO_MANY_DECIMALS");
  });

  it("rejects empty and non-numeric", () => {
    expect(validateAmount("")).toBe("AMOUNT_INVALID");
    expect(validateAmount("abc")).toBe("AMOUNT_INVALID");
    expect(validateAmount("1.2.3")).toBe("AMOUNT_INVALID");
    expect(validateAmount("1e2")).toBe("AMOUNT_INVALID");
  });

  it("rejects more than 13 integer digits", () => {
    expect(validateAmount("10000000000000")).toBe("AMOUNT_TOO_LARGE");
    expect(validateAmount("9999999999999.99")).toBeUndefined();
  });
});

describe("validateDate", () => {
  it("accepts YYYY-MM-DD on or before today UTC", () => {
    expect(validateDate("2024-01-30", clock)).toBeUndefined();
    expect(validateDate("2024-06-01", clock)).toBeUndefined();
  });

  it("rejects unpadded, garbage, empty, impossible calendar dates", () => {
    expect(validateDate("2024-1-30", clock)).toBe("DATE_INVALID");
    expect(validateDate("not-a-date", clock)).toBe("DATE_INVALID");
    expect(validateDate("", clock)).toBe("DATE_INVALID");
    expect(validateDate("2024-02-30", clock)).toBe("DATE_INVALID");
  });

  it("rejects future dates vs frozen clock", () => {
    expect(validateDate("2024-06-02", clock)).toBe("PAYMENT_DATE_FUTURE");
  });
});

describe("validateType", () => {
  it("accepts incoming and outgoing", () => {
    expect(validateType("incoming")).toBeUndefined();
    expect(validateType("outgoing")).toBeUndefined();
  });

  it("rejects case mismatch, unknown, empty", () => {
    expect(validateType("INCOMING")).toBe("TYPE_INVALID");
    expect(validateType("foo")).toBe("TYPE_INVALID");
    expect(validateType("")).toBe("TYPE_INVALID");
  });
});

describe("validateRow", () => {
  it("returns no errors for a valid row", () => {
    expect(validateRow(row(), clock)).toEqual([]);
  });

  it("collects multiple field errors", () => {
    const errors = validateRow(
      row({ paymentDate: "", amount: "0", type: "nope", contractNumber: "   " }),
      clock,
    );
    expect(errors.map((error) => error.code)).toEqual([
      "DATE_INVALID",
      "AMOUNT_NON_POSITIVE",
      "TYPE_INVALID",
      "COLUMN_MISSING",
    ]);
  });

  it("flags whitespace-only contract number", () => {
    expect(validateRow(row({ contractNumber: "  " }), clock)).toEqual([
      { row: 1, code: "COLUMN_MISSING" },
    ]);
  });
});

describe("MAX_FILE_BYTES", () => {
  it("is 1MB", () => {
    expect(MAX_FILE_BYTES).toBe(1 * 1024 * 1024);
  });
});
