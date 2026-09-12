import globals from 'globals';
import storybook from 'eslint-plugin-storybook';
import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

export default [
  {
    ignores: [
      '.github/dependabot.yml',
      '!.*',
      '*.tgz',
      'dist/',
      'scripts/',
      'coverage/',
      'node_modules/',
      'storybook-static/',
      'build-storybook.log',
      '.DS_Store',
      '.env',
      '.idea',
      '.vscode',
    ],
  },
  { languageOptions: { globals: globals.browser } },
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
  // ── DESIGNBOOK-60 module boundaries (AC-3 cycles, AC-6 directions) ──────────
  // The six src/ module directories have enforced dependency directions. The
  // resolver maps the ESM `.js` specifiers this package uses onto the `.ts`
  // sources so both rules see the real edges.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: './tsconfig.json' })],
    },
    rules: {
      // AC-3: no import cycles anywhere in src. Type-only edges are ignored to
      // match the intent (runtime cycles are what break module init order); the
      // pre-existing engines type-only cycles are harmless.
      'import-x/no-cycle': ['error', { maxDepth: Infinity }],
      // AC-6: allowed directions between shared / scene-model / validation /
      // tools / workflow / addon. cli.ts (root) and src/cli/ are the composition
      // layer and match no target zone, so they may import anything. addon's
      // outbound edges are unrestricted (it is the top of the Storybook/build
      // side and legitimately uses scene-model, tools and workflow); the one
      // hard rule about addon is that nothing below it may import it.
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            // validation is renderer-free (AC-1) and daemon-free (AC-2): it may
            // reach only scene-model + shared, never tools/workflow/addon.
            { target: './src/validation', from: './src/tools' },
            { target: './src/validation', from: './src/workflow' },
            { target: './src/validation', from: './src/addon' },
            // scene-model is a leaf over shared.
            { target: './src/scene-model', from: './src/validation' },
            { target: './src/scene-model', from: './src/tools' },
            { target: './src/scene-model', from: './src/workflow' },
            { target: './src/scene-model', from: './src/addon' },
            // shared is a pure leaf.
            { target: './src/shared', from: './src/scene-model' },
            { target: './src/shared', from: './src/validation' },
            { target: './src/shared', from: './src/tools' },
            { target: './src/shared', from: './src/workflow' },
            { target: './src/shared', from: './src/addon' },
            // tools may reach scene-model/validation/shared, never orchestrate
            // workflow or reach the addon.
            { target: './src/tools', from: './src/workflow' },
            { target: './src/tools', from: './src/addon' },
            // nothing below the addon may import it.
            { target: './src/workflow', from: './src/addon' },
          ],
        },
      ],
    },
  },
  {
    // Tests legitimately import across layers; boundaries apply to production.
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
    rules: { 'import-x/no-restricted-paths': 'off' },
  },
  {
    // Drupal behavior fixtures use the Drupal/once globals the SDC previewHead
    // provides at runtime; declare them so no-undef does not flag the fixture.
    files: ['**/__tests__/fixtures/**/*.js'],
    languageOptions: { globals: { Drupal: 'readonly', once: 'readonly' } },
  },
  prettierRecommended,
];
