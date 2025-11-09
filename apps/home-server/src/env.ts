import { config as loadEnv } from "dotenv";
import { z } from "zod";

const envFile = process.env.HOME_SERVER_ENV_FILE;
loadEnv(envFile ? { path: envFile } : undefined);

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOME_SERVER_PORT: z.coerce.number().default(4300),
  HOME_SERVER_HOST: z.string().default("127.0.0.1"),
  HOME_SERVER_MEDIA_ROOT: z.string().default("./media"),
  HOME_SERVER_LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse({
  NODE_ENV: process.env.NODE_ENV,
  HOME_SERVER_PORT: process.env.HOME_SERVER_PORT,
  HOME_SERVER_HOST: process.env.HOME_SERVER_HOST,
  HOME_SERVER_MEDIA_ROOT: process.env.HOME_SERVER_MEDIA_ROOT,
  HOME_SERVER_LOG_LEVEL: process.env.HOME_SERVER_LOG_LEVEL,
});


