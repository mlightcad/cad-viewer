import globals from 'globals'
import jsLint from '@eslint/js'
import vueI18n from '@intlify/eslint-plugin-vue-i18n'
import tsLint from 'typescript-eslint'
import vueLint from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort'

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,jsx,tsx}"],
    languageOptions: {
      // common parser options, enable TypeScript and JSX
      parser: "@typescript-eslint/parser",
      parserOptions: {
        sourceType: "module"
      }
    }
  },
  {
    files: ["*.vue", "**/*.vue"],
    languageOptions: {
      parser: "vue-eslint-parser",
      parserOptions: {
        // <script lang="ts" /> to enable TypeScript in Vue SFC
        parser: "@typescript-eslint/parser",
        sourceType: "module"
      }
    }
  },
  { 
    languageOptions: { 
      globals: { 
        ...globals.browser,
      } 
    }
  },
  {
    plugins: {
      // key "simple-import-sort" is the plugin namespace
      "simple-import-sort": pluginSimpleImportSort
    },
    rules: {
      "simple-import-sort/imports": [
        "error"
      ]
    }
  },
  jsLint.configs.recommended,
  ...tsLint.configs.recommended,
  ...vueLint.configs["flat/essential"],
  ...vueI18n.configs['flat/recommended'],
  {
    ignores: ['node_modules', 'dist', 'public', '.nuxt']
  },
  eslintConfigPrettier,
  {
    rules: {
      '@intlify/vue-i18n/no-dynamic-keys': 'error',
      '@intlify/vue-i18n/no-unused-keys': [
        'error',
        {
          extensions: ['.js', '.ts', '.vue']
        }
      ],
      "@typescript-eslint/no-empty-object-type": ["off"],
      "@typescript-eslint/no-unused-expressions": ["off"],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'quotes': ['error', 'single']
    },
    settings: {
      'vue-i18n': {
        localeDir: './**/locales/*.{json,json5,ts,js,yaml,yml}',
        // Specify the version of `vue-i18n` you are using.
        // If not specified, the message will be parsed twice.
        messageSyntaxVersion: '^9.0.0'
      }
    }
  }
]