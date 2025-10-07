import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [eslint.configs.recommended, tseslint.configs.recommended, 'plugin:prettier/recommended'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'warn',
    'max-len': [
      'error',
      {
        code: 120,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignorePattern: '^import\\s.+\\sfrom\\s.+;$',
      },
    ],
  },
};
