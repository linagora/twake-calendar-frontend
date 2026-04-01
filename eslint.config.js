import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import tanstackQuery from '@tanstack/eslint-plugin-query'
import cozyReact from 'eslint-config-cozy-app/react'

// Flatten cozyReact config (may be an object or array)
const cozyReactConfigs = Array.isArray(cozyReact) ? cozyReact : [cozyReact]

export default [
  {
    ignores: [
      'dist/',
      'build/',
      'node_modules/',
      'coverage/',
      'public/',
      '*.config.js',
      '*.config.ts',
      'fileTransformer.ts'
    ]
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  // TanStack Query recommended rules
  ...tanstackQuery.configs['flat/recommended'],

  // Cozy React recommended rules
  ...cozyReactConfigs,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: true
      }
    },

    settings: {
      react: {
        version: 'detect'
      }
    },

    rules: {
      /* React */
      'react/react-in-jsx-scope': 'off', // React 18+
      'react/prop-types': 'off',

      /* Hooks */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /* Imports */
      'import/order': 'off',

      /* TS */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],

      // TO DO: Turn these back on warning
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/require-await': 'warn',

      /* Jest */
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',

      /* Keep cozyReact prettier options but skip singleQuote/semi to avoid unnecessary changes */
      'prettier/prettier': 'error',

      /* No noises */
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }]
    }
  }
]
