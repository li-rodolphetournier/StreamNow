import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

const envFile = process.env.CI ? ".env.test" : ".env.local";
dotenv.config({ path: path.resolve(__dirname, envFile), override: false });

const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

if (!tmdbApiKey) {
  throw new Error(
    `NEXT_PUBLIC_TMDB_API_KEY is not defined. Ensure it is set in ${
      process.env.CI ? "CI secrets or .env.test" : ".env.local"
    }.`
  );
}

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
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});


