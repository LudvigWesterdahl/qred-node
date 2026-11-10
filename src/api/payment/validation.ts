import type { Clock } from "../../clock.js";
import type { ParsedPayment } from "./parsers/types.js";

export type RowError = {
  row: number;
  code: string;
};

export const MAX_FILE_BYTES = 1 * 1024 * 1024;
export const MAX_AMOUNT_INTEGER_DIGITS = 13;

export function validateRow(row: ParsedPayment, clock: Clock): RowError[] {
  const errors: RowError[] = [];

  const dateCode = validateDate(row.paymentDate.trim(), clock);
  if (dateCode) {
    errors.push({ row: row.row, code: dateCode });
  }

  const amountCode = validateAmount(row.amount.trim());
  if (amountCode) {
    errors.push({ row: row.row, code: amountCode });
  }

  const typeCode = validateType(row.type.trim());
  if (typeCode) {
    errors.push({ row: row.row, code: typeCode });
  }

  if (row.contractNumber.trim() === "") {
    errors.push({ row: row.row, code: "COLUMN_MISSING" });
  }

  return errors;
}

export function validateDate(value: string, clock: Clock): string | undefined {
  value = value.trim();
  if (value === "") {
    return "DATE_INVALID";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "DATE_INVALID";
  }

  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const realDate =
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
  if (!realDate) {
    return "DATE_INVALID";
  }

  if (value > clock.todayUtc()) {
    return "PAYMENT_DATE_FUTURE";
  }

  return undefined;
}

export function validateAmount(value: string): string | undefined {
  value = value.trim();
  if (value === "") {
    return "AMOUNT_INVALID";
  }
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    return "AMOUNT_INVALID";
  }

  const dot = value.indexOf(".");
  if (dot !== -1 && value.length - dot - 1 > 2) {
    return "AMOUNT_TOO_MANY_DECIMALS";
  }

  const unsignedInteger = value.replace(/^-/, "").split(".")[0] ?? "0";
  const significantInteger = unsignedInteger.replace(/^0+/, "") || "0";
  if (significantInteger !== "0" && significantInteger.length > MAX_AMOUNT_INTEGER_DIGITS) {
    return "AMOUNT_TOO_LARGE";
  }

  if (value.startsWith("-") || /^0+(\.0+)?$/.test(value)) {
    return "AMOUNT_NON_POSITIVE";
  }

  return undefined;
}

export function validateType(value: string): string | undefined {
  value = value.trim();
  if (value !== "incoming" && value !== "outgoing") {
    return "TYPE_INVALID";
  }
  return undefined;
}
