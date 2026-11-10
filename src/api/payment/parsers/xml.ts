import { XMLParser } from "fast-xml-parser";

import { DomainError } from "../../../errors.js";
import type { ParsedPayment } from "./types.js";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  parseTagValue: false,
  isArray: (name) => name === "payment",
});

export function parseXml(buffer: Buffer): ParsedPayment[] {
  const text = buffer.toString("utf8");
  if (text.trim() === "") {
    throw new DomainError("FILE_EMPTY");
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(text);
  } catch {
    throw new DomainError("XML_INVALID");
  }

  if (!isObject(parsed) || !("payments" in parsed)) {
    throw new DomainError("XML_INVALID");
  }

  const root = parsed.payments;
  if (root === "" || root === undefined || root === null) {
    return [];
  }
  if (!isObject(root)) {
    throw new DomainError("XML_INVALID");
  }

  const payments = root.payment;
  if (payments === undefined) {
    return [];
  }
  if (!Array.isArray(payments)) {
    throw new DomainError("XML_INVALID");
  }

  return payments.map((item, index) => {
    if (!isObject(item)) {
      throw new DomainError("XML_INVALID");
    }
    return {
      row: index + 1,
      paymentDate: stringify(item.payment_date),
      amount: stringify(item.amount),
      type: stringify(item.type),
      contractNumber: stringify(item.contract_number),
    };
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}
