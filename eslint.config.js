const js = require('@eslint/js');
const vue = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      '.ignored',
      'node_modules',
      'test-output',
      'src/.sandbox.*',
      'dist',
    ],
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,cjs,mjs,jsx,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'space-before-function-paren': ['error', 'always'],
      'no-return-assign': ['error', 'except-parens'],
      'no-else-return': ['error', { allowElseIf: true }],
      'class-methods-use-this': 'off',
      'no-restricted-syntax': 'off',
      'prefer-arrow-callback': 'off',
      'func-names': 'off',
      'object-shorthand': 'off',
      'no-underscore-dangle': 'off',
      'no-plusplus': 'off',
      strict: 'off',
      'no-undef': 'off',
      radix: 'off',
      'max-len': ['warn', { code: 150 }],
      quotes: ['error', 'single', { avoidEscape: true }],
      'spaced-comment': 'warn',
      'no-sequences': 'warn',
      'no-param-reassign': ['warn', { props: false }],
      'comma-dangle': [
        'warn',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'ignore',
          exports: 'ignore',
          functions: 'ignore',
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'vue/max-attributes-per-line': 'off',
    },
  },
];
