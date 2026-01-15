import js from "@eslint/js";
import tseslint from "typescript-eslint";

const nodeGlobals = {
  console: "readonly",
  process: "readonly",
  module: "readonly",
  require: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  Buffer: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  fetch: "readonly", 
};

const jestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  beforeAll: "readonly",
  beforeEach: "readonly",
  afterAll: "readonly",
  afterEach: "readonly",
  jest: "readonly",
};

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },

  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
  },

  {
    files: [
      "**/*.cjs",
      "jest.config.js",
      "**/*.config.js",
      "test-calendar-api.js",
      "scripts/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: nodeGlobals,
    },
    rules: {
      "no-console": "off",
    },
  },

  {
    files: ["**/*.{test,spec}.ts", "**/*.{test,spec}.tsx", "tests/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...nodeGlobals, ...jestGlobals },
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
    },
  },
];