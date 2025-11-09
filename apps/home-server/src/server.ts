import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart, { MultipartFile } from "@fastify/multipart";
import fastify, { FastifyInstance } from "fastify";
import { createWriteStream } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Writable } from "stream";
import { env } from "./env";
import { scanMediaLibrary } from "./mediaScanner";

interface UploadSummary {
  relativePath: string;
  size: number;
}

interface UploadError {
  relativePath: string;
  reason: string;
}

const sanitizeRelativePath = (rawValue: string | undefined | null): string | null => {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = path.normalize(trimmed).replace(/\\/g, "/");

  if (
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\") ||
    path.isAbsolute(normalized) ||
    normalized.split("/").some((segment) => segment === ".." || segment === "")
  ) {
    return null;
  }

  return normalized;
};

const discardStream = async (stream: NodeJS.ReadableStream) => {
  const sink = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  await pipeline(stream, sink);
};

export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.HOME_SERVER_LOG_LEVEL,
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    hidePoweredBy: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 2 * 1024 * 1024,
      fields: 10,
      fileSize: 8 * 1024 * 1024 * 1024, // 8 GB
      files: 200,
      headerPairs: 2000,
    },
  });

  app.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
    mediaRoot: env.HOME_SERVER_MEDIA_ROOT,
  }));

  app.get("/", async () => ({
    name: "StreamNow Home",
    version: "0.1.0",
    status: "ready",
    timestamp: new Date().toISOString(),
  }));

  app.get("/api/v1/ping", async () => ({
    message: "pong",
    timestamp: new Date().toISOString(),
  }));

  app.get("/api/v1/media", async (_, reply) => {
    try {
      const payload = await scanMediaLibrary();
      return payload;
    } catch (error) {
      app.log.error({ err: error }, "Failed to scan media library");
      reply.code(500);
      return {
        status: "error",
        message: "Impossible de récupérer la bibliothèque locale",
      };
    }
  });

  app.post("/api/v1/media/upload", async (request, reply) => {
    const mediaRoot = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
    await fs.mkdir(mediaRoot, { recursive: true });

    const savedFiles: UploadSummary[] = [];
    const errors: UploadError[] = [];
    let processedFiles = 0;

    const parts = request.parts();

    for await (const part of parts) {
      if (part.type !== "file") {
        continue;
      }

      const filePart = part as MultipartFile;

      processedFiles += 1;

      const sanitizedPath = sanitizeRelativePath(
        filePart.filename ?? filePart.fieldname ?? undefined
      );

      if (!sanitizedPath) {
        errors.push({
          relativePath: filePart.filename ?? "(inconnu)",
          reason: "Chemin invalide ou non autorisé.",
        });
        await discardStream(filePart.file);
        continue;
      }

      const absoluteTarget = path.join(mediaRoot, sanitizedPath);

      if (!absoluteTarget.startsWith(mediaRoot)) {
        errors.push({
          relativePath: sanitizedPath,
          reason: "Chemin en dehors du dossier média.",
        });
        await discardStream(filePart.file);
        continue;
      }

      try {
        await fs.mkdir(path.dirname(absoluteTarget), { recursive: true });
        const writeStream = createWriteStream(absoluteTarget);
        await pipeline(filePart.file, writeStream);
        const stats = await fs.stat(absoluteTarget);
        savedFiles.push({
          relativePath: sanitizedPath,
          size: stats.size,
        });
      } catch (error) {
        request.log.error(
          {
            err: error,
            relativePath: sanitizedPath,
          },
          "Failed to persist uploaded media file"
        );
        errors.push({
          relativePath: sanitizedPath,
          reason: "Échec de l'écriture du fichier.",
        });
      }
    }

    if (processedFiles === 0) {
      reply.code(400);
      return {
        status: "error",
        message: "Aucun fichier reçu.",
        savedFiles,
        errors,
      };
    }

    const statusCode = errors.length > 0 ? 207 : 201;
    reply.code(statusCode);

    return {
      status: errors.length > 0 ? "partial" : "ok",
      savedFiles,
      errors,
    };
  });

  return app;
}


