import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/__tests__/**"],
      reporter: ["text", "json-summary"],
      // TODO: raise to 80 as test coverage improves
      thresholds: { lines: 20, functions: 25, branches: 15, statements: 20 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
