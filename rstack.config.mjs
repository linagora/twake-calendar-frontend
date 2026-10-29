import tanstackQuery from '@tanstack/eslint-plugin-query'
import { define } from 'rstack'
import fmt from 'rslint-config-cozy-app/fmt'
import react from 'rslint-config-cozy-app/react'

define.lint(lint => [
  ...react(lint),
  ...tanstackQuery.configs['flat/recommended'],
  {
    rules: {
      'import/order': 'off',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      // TO DO: Turn these back on
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/require-await': 'warn'
    }
  }
])

define.fmt({
  ...fmt,
  ignorePatterns: [
    // Markdown docs (formatting handled manually)
    '*.md',
    'public/.env.example.js'
  ]
})
