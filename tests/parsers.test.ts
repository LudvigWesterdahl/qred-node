import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DomainError } from "../src/errors.js";
import { detectFormat } from "../src/api/payment/parsers/detect.js";
import { parseCsv } from "../src/api/payment/parsers/csv.js";
import { parseXml } from "../src/api/payment/parsers/xml.js";

const exampleCsv = readFileSync("examples/payments-1.csv");
const exampleXml = readFileSync("examples/payments-1.xml");

describe("detectFormat", () => {
  it("uses extension first", () => {
    expect(detectFormat("x.csv", "application/xml", Buffer.from("<x/>"))).toBe("csv");
    expect(detectFormat("x.xml", "text/csv", Buffer.from("payment_date"))).toBe("xml");
  });

  it("sniffs content when name/mime unknown", () => {
    expect(detectFormat("file", undefined, Buffer.from("  <payments/>"))).toBe("xml");
    expect(detectFormat("file", undefined, Buffer.from("payment_date,amount"))).toBe("csv");
  });

  it("rejects unknown format", () => {
    expect(() => detectFormat("file.bin", "application/octet-stream", Buffer.from("zzz"))).toThrow(
      DomainError,
    );
  });

  it("rejects a text file", () => {
    expect(() => detectFormat("payments.txt", "text/plain", Buffer.from("hello"))).toThrowError(
      "FILE_UNSUPPORTED",
    );
  });
});

describe("parseCsv", () => {
  it("parses example file and trims spaces after commas", () => {
    expect(parseCsv(exampleCsv)).toEqual([
      {
        row: 1,
        paymentDate: "2024-01-30",
        amount: "1000.00",
        type: "incoming",
        contractNumber: "101",
      },
      {
        row: 2,
        paymentDate: "2024-01-31",
        amount: "500.00",
        type: "outgoing",
        contractNumber: "201",
      },
    ]);
  });

  it("skips blank lines", () => {
    const csv = Buffer.from("payment_date,amount,type,contract_number\n\n2024-01-30,1,incoming,101\n\n");
    expect(parseCsv(csv)).toHaveLength(1);
  });

  it("rejects missing columns", () => {
    const csv = Buffer.from("payment_date,amount,type\n2024-01-30,1,incoming\n");
    expect(() => parseCsv(csv)).toThrowError("COLUMN_MISSING");
  });

  it("rejects empty file", () => {
    expect(() => parseCsv(Buffer.from("   "))).toThrowError("FILE_EMPTY");
  });
});

describe("parseXml", () => {
  it("parses example file with many payments", () => {
    expect(parseXml(exampleXml)).toEqual([
      {
        row: 1,
        paymentDate: "2024-01-30",
        amount: "1000.00",
        type: "incoming",
        contractNumber: "101",
      },
      {
        row: 2,
        paymentDate: "2024-01-31",
        amount: "500.00",
        type: "outgoing",
        contractNumber: "201",
      },
    ]);
  });

  it("parses a single payment", () => {
    const xml = Buffer.from(`<payments>
      <payment>
        <payment_date>2024-01-30</payment_date>
        <amount>1000.00</amount>
        <type>incoming</type>
        <contract_number>101</contract_number>
      </payment>
    </payments>`);
    expect(parseXml(xml)).toHaveLength(1);
  });

  it("rejects invalid xml", () => {
    expect(() => parseXml(Buffer.from("<not-payments/>"))).toThrowError("XML_INVALID");
  });

  it("treats empty payments as no rows", () => {
    expect(parseXml(Buffer.from("<payments></payments>"))).toEqual([]);
    expect(parseXml(Buffer.from("<payments/>"))).toEqual([]);
  });

  it("rejects empty file", () => {
    expect(() => parseXml(Buffer.from("   "))).toThrowError("FILE_EMPTY");
  });
});
