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
    files: ["**/tests/**/*.{ts,tsx,js}", "**/*.test.{ts,tsx,js}"],
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
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/[\\u4e00-\\u9fff]/]:not(CallExpression[callee.object.name='console'] > Literal)",
          message:
            "UI 文案請放到 i18n messages JSON，並透過翻譯函數（例如 useTranslations）取得。",
        },
        // 排除 PDF 掃描相關的內容
        {
          selector:
            "Literal[value=/[\\u4e00-\\u9fff]/]:matches([value=/PDF|pdf|掃描|扫描|文件|文档|表格|字段|欄位|姓名|性别|性別|出生|地址|電話|手机|手機|郵件|邮件/])",
          message: "",
        },
      ],
    },
  },
  {
    files: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "**/tests/**/*.{ts,tsx}",
      "src/services/**/*.{ts,tsx}",
      "src/types/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": "off",
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
