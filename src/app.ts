import Fastify from "fastify";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import type { Clock } from "./clock.js";
import { DomainError } from "./errors.js";
import { registerImportRoute } from "./api/payment/import-route.js";
import type { DbClient } from "./api/payment/import-service.js";
import { MAX_FILE_BYTES } from "./api/payment/validation.js";

export async function buildApp(db: DbClient, clock: Clock) {
  const app = Fastify({ logger: true, bodyLimit: MAX_FILE_BYTES });

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(400).send({
        message: error.errorCode,
        timestamp: clock.now().toISOString(),
      });
    }

    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const message = error instanceof Error ? error.message : "";
    if (
      code.includes("FILE_TOO_LARGE") ||
      code.includes("FST_ERR_CTP_BODY_TOO_LARGE") ||
      message.toLowerCase().includes("too large")
    ) {
      return reply.status(400).send({
        message: "FILE_TOO_LARGE",
        timestamp: clock.now().toISOString(),
      });
    }

    const status =
      error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500;
    if (status >= 400 && status < 500) {
      return reply.status(400).send({
        message: message || code,
        timestamp: clock.now().toISOString(),
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      message: null,
      timestamp: clock.now().toISOString(),
    });
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Qred Payment Import",
        version: "1.0.0",
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/swagger-ui.html" });
  await app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES } });
  app.addContentTypeParser(
    [
      "application/octet-stream",
      "text/csv",
      "application/csv",
      "text/xml",
      "application/xml",
      "text/plain",
    ],
    { parseAs: "buffer", bodyLimit: MAX_FILE_BYTES },
    (_request, body, done) => {
      done(null, body);
    },
  );
  await registerImportRoute(app, db, clock);

  return app;
}
