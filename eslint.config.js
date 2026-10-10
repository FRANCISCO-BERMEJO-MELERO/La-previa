import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'coverage/**',
    'next-env.d.ts',
    '.rsc/**',
    '.claude/**',
    '.worktrees/**',
  ]),
  ...nextVitals,
  ...nextTypescript,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-check': false,
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      'import/no-default-export': 'error',
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'TSEnumDeclaration', message: 'Usa una unión de literales en vez de enum.' },
        { selector: 'ClassDeclaration', message: 'Usa funciones en vez de clases.' },
      ],
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'start' }],
    },
  },
  {
    files: [
      'src/app/**/{page,layout,not-found,error,loading,template,default}.tsx',
      '*.config.{js,ts,mjs}',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
]);
