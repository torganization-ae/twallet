import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksStaticDeps from 'eslint-plugin-react-hooks-static-deps';
import reactXPlugin from 'eslint-plugin-react-x';
import tseslint from 'typescript-eslint';

import common from './common.js';

const recommended = tseslint.config(
  common,
  reactPlugin.configs.flat.recommended,
  reactXPlugin.configs['recommended-type-checked'],
  jsxA11yPlugin.flatConfigs.recommended,
  {
    name: '@twallet/eslint-config/frontend-recommended',
    settings: {
      react: {
        version: '19',
      },
    },
    rules: {
      '@stylistic/jsx-one-expression-per-line': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Side effect imports
            ['^\\u0000'],
            // Lib and global imports
            [
              '^react',
              '^ton',
              '^tonweb(/.*|$)',
              '^qr-code-styling(/.*|$)',
              '^@?\\w',
              'dist(/.*|$)',
              '^(\\.+/)+(lib/teact)(/.*|$)',
              '^(\\.+/)+global$',
            ],
            // Type imports
            [
              '^(\\.+/)+.+\\u0000$',
              '^(\\.+/|\\w+/)+(types)(/.*|$)',
              '^(\\.+/|\\w+/)+(types)\\u0000',
            ],
            // Config, utils, helpers
            [
              '^(\\.+/)+config',
              '^(\\.+/)+(lib)(?!/teact)(/.*|$)',
              '^(\\.+/)+global/.+',
              '^(\\.+/)+(util)(/.*|$)',
              '^(\\.+/)+(contracts)(/.*|$)',
              '^\\.\\.(?!/?$)',
              '^\\.\\./?$',
              '^\\./(?=.*/)(?!/?$)',
              '^\\.(?!/?$)',
              '^\\./?$',
            ],
            // Hooks
            [
              '.+(/hooks/)(.*|$)',
            ],
            // Components
            [
              '/[A-Z](([a-z]+[A-Z]?)*)',
            ],
            // Styles and CSS modules
            [
              '^.+\\.s?css$',
            ],
            // Assets: images, stickers, etc
            [
              '^(\\.+/)+(assets)(/.*|$)',
            ],
          ],
        },
      ],
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks-static-deps/exhaustive-deps': [
        'error',
        {
          // eslint-disable-next-line @stylistic/max-len
          additionalHooks: '(useSyncEffect|useAsync|useDebouncedCallback|useThrottledCallback|useEffectWithPrevDeps|useLayoutEffectWithPrevDeps|useDerivedState|useDerivedSignal|useThrottledResolver|useDebouncedResolver|useThrottleForHeavyAnimation)$',
          staticHooks: {
            getActions: true,
            useFlag: [false, true, true],
            useForceUpdate: true,
            useReducer: [false, true],
            useLastCallback: true,
          },
        },
      ],
      'react/prop-types': 'off',
      'react/no-unknown-property': 'off',
      'react/display-name': 'off',
      'react/jsx-key': 'off',
      'react/jsx-curly-spacing': [
        'error',
        {
          when: 'never',
          attributes: true,
          children: true,
          allowMultiline: true,
        },
      ],
      'react-x/no-use-context': 'off',
      'react-x/no-context-provider': 'off',
      'react-x/no-array-index-key': 'off',
      'react-x/no-missing-key': 'off',
      'react-x/no-nested-component-definitions': 'off',
      'react-x/no-leaked-conditional-rendering': 'error',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/mouse-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'off',
      'jsx-a11y/media-has-caption': 'off',
    },
    plugins: {
      react: reactPlugin,
      'react-hooks-static-deps': reactHooksStaticDeps,
    },
  },
);

export default recommended;
