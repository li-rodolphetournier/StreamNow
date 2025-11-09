import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastify, { FastifyInstance } from "fastify";
import { env } from "./env";

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

  return app;
}


