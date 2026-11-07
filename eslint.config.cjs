const vue = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

// Formatting (indentation, quotes, ...) is left to Prettier: `npm run format`.
module.exports = [
    {
        ignores: ['dist/**', 'node_modules/**', 'service/**', 'coverage/**'],
    },
    ...vue.configs['flat/essential'],
    {
        files: ['**/*.{js,ts,vue}'],
        languageOptions: {
            // vue-eslint-parser handles <template>, and delegates <script>
            // blocks and plain .ts/.js files to the TypeScript parser
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                ecmaVersion: 'latest',
                sourceType: 'module',
                extraFileExtensions: ['.vue'],
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            'vue/multi-word-component-names': 'off',
            // The study set is a shared mutable model (scheduler, history,
            // lines...): only forbid reassigning the props themselves.
            'vue/no-mutating-props': ['error', { shallowOnly: true }],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
];
