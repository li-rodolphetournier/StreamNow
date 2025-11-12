import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

const envFile = process.env.CI ? ".env.test" : ".env.local";
dotenv.config({ path: path.resolve(__dirname, envFile), override: false });

const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY ?? "mock-api-key";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_TMDB_API_KEY: tmdbApiKey,
      NEXT_PUBLIC_USE_MOCK_TMDB: "true",
      TMDB_USE_MOCKS: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});


