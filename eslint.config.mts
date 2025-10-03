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
  { ignores: ["**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**"] },

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

  // Node-specific globals for config files
  {
    files: ["*.config.{cjs,js,mjs}", "*.config.{ts,mts}", "**/.*rc.cjs", "**/*.config.cjs", "prettier.config.cjs"],
    languageOptions: { globals: globals.node },
  },

  // Ensure ESLint and Prettier don't conflict (keep this last)
  prettierFlat,
]);
