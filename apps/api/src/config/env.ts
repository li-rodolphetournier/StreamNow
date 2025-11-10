import { config as loadEnv } from "dotenv";

loadEnv();

const required = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing environment variable ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev: process.env.NODE_ENV !== "production",
  port: Number(process.env.API_PORT ?? "4000"),
  databaseUrl: required(process.env.DATABASE_URL, "DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: required(process.env.JWT_SECRET, "JWT_SECRET"),
  refreshTokenSecret: required(
    process.env.REFRESH_TOKEN_SECRET,
    "REFRESH_TOKEN_SECRET"
  ),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "30d",
  tmdbApiKey: required(process.env.TMDB_API_KEY, "TMDB_API_KEY"),
  logLevel: process.env.LOG_LEVEL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  facebookClientId: process.env.FACEBOOK_CLIENT_ID,
  facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  facebookRedirectUri: process.env.FACEBOOK_REDIRECT_URI,
  serviceToken: required(process.env.SERVICE_TOKEN, "SERVICE_TOKEN"),
  algoliaAppId: process.env.ALGOLIA_APP_ID,
  algoliaAdminApiKey: process.env.ALGOLIA_ADMIN_API_KEY,
  algoliaSearchApiKey: process.env.ALGOLIA_SEARCH_API_KEY,
  algoliaIndexName: process.env.ALGOLIA_INDEX_NAME ?? "streamnow_videos",
};

