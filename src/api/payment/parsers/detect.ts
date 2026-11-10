import { DomainError } from "../../../errors.js";

export type FileFormat = "csv" | "xml";

export function detectFormat(filename: string, mimetype: string | undefined, buffer: Buffer): FileFormat {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith(".csv")) {
    return "csv";
  }
  if (lowerName.endsWith(".xml")) {
    return "xml";
  }

  const lowerMime = mimetype?.toLowerCase() ?? "";
  if (lowerMime.includes("csv")) {
    return "csv";
  }
  if (lowerMime.includes("xml")) {
    return "xml";
  }

  const start = buffer.toString("utf8").trimStart();
  if (start.startsWith("<")) {
    return "xml";
  }
  if (start.toLowerCase().includes("payment_date")) {
    return "csv";
  }

  throw new DomainError("FILE_UNSUPPORTED");
}
