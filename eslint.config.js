import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import next from '@next/eslint-plugin-next'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@next/next': next,
    },
    rules: {
      ...next.configs.recommended.rules,
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/tests/**/*.{ts,tsx,js}', '**/*.test.{ts,tsx,js}'],
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
      '@next/next/no-html-link-for-pages': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
  {
    // 測試文件和腳本文件允許使用 require
    files: [
      'scripts/**/*.{js,ts}',
      '**/tests/**/*.{ts,tsx,js}',
      '**/*.test.{ts,tsx,js}',
      '**/*.spec.{ts,tsx,js}',
      'src/tests/**/*.{ts,tsx,js}',
      'validate-json.js'
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'Literal[value=/[\\u4e00-\\u9fff]/]:not(CallExpression[callee.object.name=\'console\'] > Literal):not(:matches(VariableDeclarator, PropertyDefinition, ClassDeclaration, FunctionDeclaration))',
          message:
            'UI 文案請放到 i18n messages JSON，並透過翻譯函數（例如 useTranslations）取得。',
        },
        // 排除更多技術相關詞彙
        {
          selector:
            'Literal[value=/[\\u4e00-\\u9fff]/]:matches([value=/PDF|pdf|掃描|扫描|文件|文档|表格|字段|欄位|姓名|性别|性別|出生|地址|電話|手机|手機|郵件|邮件|模板|Template|Component|Service|Manager|Handler|Processor|Tracker|Exporter|Importer|Validator|Generator|Builder|Factory|Controller|Provider|Hook|Reducer|Action|State|Props|Config|Settings|Options|Params|Data|Result|Error|Success|Loading|Ready|Idle|Pending|Failed|Completed|Started|Stopped|Paused|Resumed|Created|Updated|Deleted|Inserted|Modified|Removed|Added|Subtracted|Multiplied|Divided|Sorted|Filtered|Grouped|Merged|Split|Joined|Connected|Disconnected|Authorized|Unauthorized|Authenticated|Unauthenticated/])',
          message: '',
        },
      ],
    },
  },
  {
    files: [
      'src/**/*.{test,spec}.{ts,tsx}',
      '**/tests/**/*.{ts,tsx}',
      'src/services/**/*.{ts,tsx}',
      'src/types/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Override default ignores of eslint-config-next
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Additional ignores for this project
    'node_modules/**',
    'dist/**',
    'coverage/**',
    'public/pdfjs/**', // 排除第三方 PDF.js 文件
    'next-intl.config.ts', // 排除 next-intl 配置文件
    'src/tests/manual/*.js', // 忽略手動測試腳本
    '*.config.js', // 忽略配置文件
    '*.config.mjs', // 忽略配置文件
  ])
])
