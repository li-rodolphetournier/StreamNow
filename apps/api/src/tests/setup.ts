import "reflect-metadata";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ?? "test-refresh-secret";
process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";
process.env.REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL ?? "30d";
process.env.TMDB_API_KEY = process.env.TMDB_API_KEY ?? "test-tmdb-key";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

