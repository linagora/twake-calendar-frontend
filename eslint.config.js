import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import jest from "eslint-plugin-jest";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist", "build", "node_modules"],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: true,
      },
    },

    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      jest,
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      /* React */
      "react/react-in-jsx-scope": "off", // React 18+
      "react/prop-types": "off",

      /* Hooks */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      /* Imports */
      "import/order": "off",

      /* TS */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],

      /* Jest */
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",

      /* Prettier compatibility */
      ...prettier.rules,

      /* No noises */
      "no-debugger": "error",
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
    },
  },
];
