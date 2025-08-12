import vue from 'eslint-plugin-vue'
import importPlugin from 'eslint-plugin-import'
import path from 'path'
import eslintConfigPrettier from 'eslint-config-prettier'

const vue3Recommended = vue.configs['flat/recommended']

export default [
    ...vue3Recommended,
    eslintConfigPrettier,
    {
        files: ['**/*.vue', '**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        plugins: {
            import: importPlugin,
        },
        settings: {
            'import/resolver': {
                alias: {
                    map: [['@', path.resolve('./src')]],
                    extensions: ['.js', '.vue'],
                },
                node: {
                    extensions: ['.js', '.vue'],
                },
            },
        },
        rules: {
            'import/no-unresolved': 'error',
            'vue/no-unused-vars': 'off',
        'vue/multi-word-component-names': 'off',
        'vue/html-indent': 'off',
        'vue/max-attributes-per-line': 'off',
        'vue/singleline-html-element-content-newline': 'off',
        'vue/multiline-html-element-content-newline': 'off',
        'vue/html-self-closing': 'off',
        'vue/attributes-order' : 'off',
        'vue/valid-template-root': 'off',
        },
    },
]
