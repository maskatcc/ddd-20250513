import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import { defineConfig } from 'eslint/config'
import stylistic from '@stylistic/eslint-plugin'

const tsCustomRules = {
  files: ['**/*.ts'],
  rules: {
    // 未使用変数の扱いはTypeScriptと同じチェック基準にする（「_」プレフィックスの変数はチェック対象外とする）
    // https://typescript-eslint.io/rules/no-unused-vars/
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
}

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs,ts}'], plugins: { js }, extends: ['js/recommended'] },
  { files: ['**/*.{js,mjs,cjs,ts}'], languageOptions: { globals: globals.node } },
  tseslint.configs.recommended,
  tsCustomRules,
  { files: ['**/*.{json,jsonc}'], plugins: { json }, language: 'json/jsonc', extends: ['json/recommended'] },
  { files: ['**/*.md'], plugins: { markdown }, language: 'markdown/gfm', extends: ['markdown/recommended'] },
  stylistic.configs.recommended,
])
