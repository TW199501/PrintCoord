const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@app/(.*)$": "<rootDir>/src/app/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^pdfjs-dist$": "<rootDir>/src/tests/__mocks__/pdfjs-dist.ts",
    "^pdfjs-dist/(.*)$": "<rootDir>/src/tests/__mocks__/pdfjs-dist.ts",
    "^pdfjs-dist/build/pdf.worker.min.mjs":
      "<rootDir>/src/tests/__mocks__/emptyMock.js",
  },
  testMatch: ["**/__tests__/**/*.test.ts?(x)", "**/tests/**/*.test.ts?(x)"],
  transform: {
    "^.+.(ts|tsx|js|jsx)$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.json" },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!pdfjs-dist)/"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
};

module.exports = config;
