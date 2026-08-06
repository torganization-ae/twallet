import tseslint from 'typescript-eslint';

import common from './common.js';

const recommended = tseslint.config(
  common,
  {
    name: '@twallet/eslint-config/backend-recommended',
    rules: {
      '@stylistic/lines-between-class-members': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            [
              '^ton',
              '^tonweb(/.*|$)',
              '^@?\\w',
              'dist(/.*|$)',
              '^(\\.+/)+(lib)(/.*|$)',
            ],
            [
              '^(\\.+/|\\w+/)+(types)(/.*|$)',
              '^(\\.+/|\\w+/)+(types)\\u0000',
            ],
            [
              '^(\\.+/)+config',
              '^(\\.+/)+(global)(/.*|$)',
              '^(\\.+/)+(util)(/.*|$)',
              '^(\\.+/)+(contracts)(/.*|$)',
              '^(\\.+/)+(ui)/[a-z](([a-z]+[A-Z]?)*)',
              '^\\.\\.(?!/?$)',
              '^\\.\\./?$',
              '^\\./(?=.*/)(?!/?$)',
              '^\\.(?!/?$)',
              '^\\./?$',
            ],
            [
              '\/[A-Z](([a-z]+[A-Z]?)*)',
            ],
          ],
        },
      ],
    },
  },
);

export default recommended;
