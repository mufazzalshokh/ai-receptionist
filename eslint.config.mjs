import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/*.d.ts",
      "apps/widget/dist/**",
      "apps/widget/build.mjs",
      "packages/voice/tsconfig.tsbuildinfo",
      "apps/web/tsconfig.tsbuildinfo",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "warn",
    },
  },
  {
    files: ["**/prisma/seed.ts"],
    rules: {
      "no-console": "off",
    },
  }
);
