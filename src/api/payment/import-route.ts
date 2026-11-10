import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Clock } from "../../clock.js";
import { DomainError } from "../../errors.js";
import { importPayments, type DbClient } from "./import-service.js";

function filenameFromHeaders(headers: FastifyRequest["headers"]): string {
  const disposition = headers["content-disposition"];
  const match = typeof disposition === "string" ? disposition.match(/filename="?([^";]+)"?/i) : null;
  return match?.[1] ?? "upload";
}

export async function registerImportRoute(
  app: FastifyInstance,
  db: DbClient,
  clock: Clock,
): Promise<void> {
  app.post(
    "/v1/payment/import",
    {
      schema: {
        consumes: [
          "multipart/form-data",
          "application/octet-stream",
          "text/csv",
          "application/xml",
          "text/xml",
        ],
        response: {
          204: {
            type: "null",
          },
        },
      },
    },
    async (request, reply) => {
      if (request.isMultipart()) {
        const uploaded = await request.file();
        if (!uploaded) {
          throw new DomainError("FILE_EMPTY");
        }

        const buffer = await uploaded.toBuffer();
        await importPayments(
          {
            filename: uploaded.filename,
            mimetype: uploaded.mimetype,
            buffer,
          },
          db,
          clock,
        );
        return reply.code(204).send();
      }

      const buffer = Buffer.isBuffer(request.body) ? request.body : Buffer.from("");
      await importPayments(
        {
          filename: filenameFromHeaders(request.headers),
          mimetype: request.headers["content-type"],
          buffer,
        },
        db,
        clock,
      );
      return reply.code(204).send();
    },
  );
}
