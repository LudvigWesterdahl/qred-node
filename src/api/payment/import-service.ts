import { DomainError } from "../../errors.js";
import type { Clock } from "../../clock.js";
import { detectFormat } from "./parsers/detect.js";
import { parseCsv } from "./parsers/csv.js";
import { parseXml } from "./parsers/xml.js";
import { MAX_FILE_BYTES, validateRow } from "./validation.js";

export type DbClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

export type ImportFile = {
  filename: string;
  mimetype?: string;
  buffer: Buffer;
};

export async function importPayments(
  file: ImportFile,
  db: DbClient,
  clock: Clock,
): Promise<void> {
  if (file.buffer.length === 0) {
    throw new DomainError("FILE_EMPTY");
  }
  if (file.buffer.length > MAX_FILE_BYTES) {
    throw new DomainError("FILE_TOO_LARGE");
  }

  const format = detectFormat(file.filename, file.mimetype, file.buffer);
  const rows = format === "csv" ? parseCsv(file.buffer) : parseXml(file.buffer);
  if (rows.length === 0) {
    throw new DomainError("FILE_EMPTY");
  }

  const errors = rows.flatMap((row) => validateRow(row, clock));

  const contractNumbers = [...new Set(rows.map((row) => row.contractNumber.trim()).filter(Boolean))];
  const found = await db.query(
    "SELECT id, contract_number FROM contract WHERE contract_number = ANY($1::varchar[])",
    [contractNumbers],
  );
  const contractIdByNumber = new Map<string, number>();
  for (const row of found.rows) {
    const record = row as { id: string | number; contract_number: string };
    contractIdByNumber.set(record.contract_number, Number(record.id));
  }

  for (const row of rows) {
    const contractNumber = row.contractNumber.trim();
    if (contractNumber === "") {
      continue;
    }
    if (!contractIdByNumber.has(contractNumber)) {
      errors.push({ row: row.row, code: "CONTRACT_MISSING" });
    }
  }

  if (errors.length > 0) {
    throw new DomainError(errors[0]?.code ?? "VALIDATION_FAILED");
  }

  const values: unknown[] = [];
  const placeholders = rows.map((row, index) => {
    const offset = index * 4;
    values.push(
      row.paymentDate.trim(),
      row.amount.trim(),
      row.type.trim(),
      contractIdByNumber.get(row.contractNumber.trim()),
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  });

  await db.query("BEGIN");
  try {
    await db.query(
      `INSERT INTO payment (payment_date, amount, type, contract_id) VALUES ${placeholders.join(", ")}`,
      values,
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }

}
