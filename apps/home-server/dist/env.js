"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
const envFile = process.env.HOME_SERVER_ENV_FILE;
(0, dotenv_1.config)(envFile ? { path: envFile } : undefined);
const schema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    HOME_SERVER_PORT: zod_1.z.coerce.number().default(4300),
    HOME_SERVER_HOST: zod_1.z.string().default("127.0.0.1"),
    HOME_SERVER_MEDIA_ROOT: zod_1.z.string().default("./media"),
    HOME_SERVER_LOG_LEVEL: zod_1.z.string().default("info"),
});
exports.env = schema.parse({
    NODE_ENV: process.env.NODE_ENV,
    HOME_SERVER_PORT: process.env.HOME_SERVER_PORT,
    HOME_SERVER_HOST: process.env.HOME_SERVER_HOST,
    HOME_SERVER_MEDIA_ROOT: process.env.HOME_SERVER_MEDIA_ROOT,
    HOME_SERVER_LOG_LEVEL: process.env.HOME_SERVER_LOG_LEVEL,
});
