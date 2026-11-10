import { parse } from "csv-parse/sync";

import { DomainError } from "../../../errors.js";
import { REQUIRED_COLUMNS, type ParsedPayment } from "./types.js";

export function parseCsv(buffer: Buffer): ParsedPayment[] {
  const text = buffer.toString("utf8");
  if (text.trim() === "") {
    throw new DomainError("FILE_EMPTY");
  }

  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: (headers: string[]) => headers.map((header) => header.trim()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch {
    throw new DomainError("CSV_INVALID");
  }

  const columns = records.length > 0 ? Object.keys(records[0] ?? {}) : readHeader(text);
  for (const required of REQUIRED_COLUMNS) {
    if (!columns.includes(required)) {
      throw new DomainError("COLUMN_MISSING");
    }
  }

  return records.map((record, index) => ({
    row: index + 1,
    paymentDate: String(record.payment_date ?? "").trim(),
    amount: String(record.amount ?? "").trim(),
    type: String(record.type ?? "").trim(),
    contractNumber: String(record.contract_number ?? "").trim(),
  }));
}

function readHeader(text: string): string[] {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "");
  if (!firstLine) {
    return [];
  }
  return firstLine.split(",").map((part) => part.trim());
}
