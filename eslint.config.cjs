const vue = require('eslint-plugin-vue');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
    {
        files: ['**/*.{js,ts,vue}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        plugins: {
            vue,
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            indent: ['error', 4],
            'vue/html-indent': ['error', 4],
            '@typescript-eslint/indent': ['error', 4],
        },
    },
];
