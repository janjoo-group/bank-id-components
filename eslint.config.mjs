import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@stencil-community/recommended',
    'plugin:jsx-a11y/recommended'
  ),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react/jsx-no-bind': ['error', {
        'allowArrowFunctions': true,
      }],
      'quotes': ['error', 'single'],
      'jsx-quotes': ['error', 'prefer-single'],
      'react/jsx-first-prop-new-line': ['error', 'multiline'],
      'react/jsx-max-props-per-line': ['error', { 'maximum': 1 }],
      'react/jsx-closing-bracket-location': ['error', 'line-aligned'],
      'react/jsx-indent': ['error', 2],
      'semi': ['error', 'always'],
    },
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        project: './tsconfig.json',
      },
    },
  }
];
