import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env";
import { logger } from "./logger";

let redisClient: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({ url: env.redisUrl });

  redisClient.on("error", (error) => {
    logger.error({ error }, "redis_client_error");
  });

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};
