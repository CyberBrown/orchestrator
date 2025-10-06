/* eslint-disable @typescript-eslint/no-explicit-any */
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import eslintConfigPrettier from "eslint-config-prettier";
// eslint-config-prettier provides a flat config object; cast to any to satisfy TS types
const prettierFlat = eslintConfigPrettier as unknown as import("eslint").Linter.Config[] | any;
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignore common generated folders
  {
    ignores: ["**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**"],
  },

  // Base JS/TS/React rules
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      // Support both browser and node (configs, scripts)
      globals: { ...globals.browser, ...globals.node },
    },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: { version: "detect" },
    },
  },

  // Project linting policies suitable for an SDK/plugin
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    rules: {
      // Prefer warnings for 'any' globally; consumers benefit from strong types,
      // but adapters and boundaries can loosen via overrides below.
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow underscore-prefixed unused vars/args to avoid noise in interfaces and handlers.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Relax typing for provider adapters and boundary integrations
  {
    files: [
      "src-core/plugins/**/*.{ts,tsx,mts,cts}",
      "src-core/orchestrator/**/*.{ts,tsx,mts,cts}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Node-specific globals for config files
  {
    files: [
      "*.config.{cjs,js,mjs}",
      "*.config.{ts,mts}",
      "**/.*rc.cjs",
      "**/*.config.cjs",
      "prettier.config.cjs",
    ],
    languageOptions: { globals: globals.node },
  },

  // Ensure ESLint and Prettier don't conflict (keep this last)
  prettierFlat,
]);
