import eslint from '@eslint/js';
import stylisticJs from '@stylistic/eslint-plugin';
import importsPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import noNullPlugin from 'eslint-plugin-no-null';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

const recommended = tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylistic,
  stylisticJs.configs.customize({
    semi: true,
    arrowParens: 'always',
    braceStyle: '1tbs',
    quoteProps: 'as-needed',
  }),
  {
    name: '@twallet/eslint-config/common-recommended',
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    rules: {
      'no-null/no-null': 'error',
      'no-console': 'error',
      'no-template-curly-in-string': 'error',
      'object-shorthand': 'error',
      curly: ['error', 'multi-line'],
      'no-prototype-builtins': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@stylistic/max-len': ['error', {
        code: 120,
        ignoreComments: true,
        ignorePattern: '\\sd=".+"', // Ignore lines with "d" attribute
      }],
      '@stylistic/indent': ['error', 2, {
        SwitchCase: 1,
        flatTernaryExpressions: false,
      }],
      '@stylistic/multiline-ternary': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          caughtErrors: 'none',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'unused-imports/no-unused-imports': 'error',
    },
    plugins: {
      'no-null': noNullPlugin,
      'simple-import-sort': simpleImportSortPlugin,
      import: importsPlugin,
      'unused-imports': unusedImports,
      jest: jestPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
      globals: jestPlugin.environments.globals.globals,
    },
  },
);

export default recommended;
