/* eslint-disable @typescript-eslint/no-require-imports */
// eslint.config.js
const js = require("@eslint/js");
const next = require("@next/eslint-plugin-next");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  next.configs["core-web-vitals"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx,js}", "**/*.test.{ts,tsx,js}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    rules: {
      "@next/next/no-html-link-for-pages": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-empty-object-type": "error",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "public/pdfjs/**", // 排除第三方 PDF.js 文件
    ],
  }
);
