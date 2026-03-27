import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import jest from "eslint-plugin-jest";
import prettier from "eslint-config-prettier";
import reactFunc from "eslint-plugin-react-func";

export default [
  {
    ignores: [
      "dist/",
      "build/",
      "node_modules/",
      "coverage/",
      "public/",
      "*.config.js",
      "*.config.ts",
      "fileTransformer.ts",
    ],
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
      "react-func": reactFunc,
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
      "react/no-array-index-key": "error",
      "react/jsx-no-leaked-render": "error",
      "react/no-children-prop": "error",
      "react-func/max-lines-per-function": [
        "warn",
        {
          max: 250,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      /* Hooks */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      /* Imports */
      "import/order": "off",

      /* TS */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "error",

      /* Jest */
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",

      /* General JS strictness */
      eqeqeq: "error",
      curly: "error",
      "prefer-const": "error",
      "default-case": "error",
      "no-else-return": "error",
      "object-shorthand": "error",
      "no-param-reassign": "error",
      "no-implicit-coercion": "error",

      /* Prettier compatibility */
      ...prettier.rules,

      /* No noises */
      "no-debugger": "error",
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
    },
  },
  {
    // Apply standard max-lines-per-function for non-React files that are not covered by react-func
    files: ["**/*.js", "**/*.ts"],
    rules: {
      "max-lines-per-function": [
        "warn",
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
    },
  },
];
