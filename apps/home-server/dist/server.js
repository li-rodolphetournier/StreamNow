"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const fastify_1 = __importDefault(require("fastify"));
const env_1 = require("./env");
async function createServer() {
    const app = (0, fastify_1.default)({
        logger: {
            level: env_1.env.HOME_SERVER_LOG_LEVEL,
        },
    });
    await app.register(helmet_1.default, {
        contentSecurityPolicy: false,
        hidePoweredBy: true,
    });
    await app.register(cors_1.default, {
        origin: true,
        credentials: true,
    });
    app.get("/health", async () => ({
        status: "ok",
        uptime: process.uptime(),
        mediaRoot: env_1.env.HOME_SERVER_MEDIA_ROOT,
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
