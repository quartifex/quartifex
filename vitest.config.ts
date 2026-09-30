import { defineConfig } from "vitest/config";

// One Vitest run for the whole repo: root tests (catalog, generators) plus each
// package's and app's unit tests.
export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "packages/*/src/**/*.test.{ts,tsx}",
      "packages/*/test/**/*.test.{ts,tsx}",
      "apps/*/src/**/*.test.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/dist/**", "**/.next/**"],
  },
});
