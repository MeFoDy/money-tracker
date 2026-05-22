import js from '@eslint/js';
import globals from 'globals';
import unicorn from 'eslint-plugin-unicorn';

export default [
  {
    ignores: [
      'node_modules/**',
      'data/**',
      'src/web/public/vendor/**',
    ],
  },
  js.configs.recommended,
  unicorn.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/custom-error-definition': 'error',
      'unicorn/error-message': 'error',
      'unicorn/catch-error-name': ['error', { name: 'error' }],
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-string-raw': 'off',
      'unicorn/prefer-structured-clone': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['src/web/public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        Alpine: 'readonly',
        Chart: 'readonly',
      },
    },
    rules: {
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-node-protocol': 'off',
    },
  },
];
