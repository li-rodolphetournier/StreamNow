import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js"],
  setupFiles: ["<rootDir>/src/tests/setup.ts"],
  clearMocks: true,
};

export default config;

