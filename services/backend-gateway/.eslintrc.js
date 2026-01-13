module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'sonarjs'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended-legacy',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules', 'coverage'],
  rules: {
    // TypeScript specific rules - all relaxed
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-this-alias': 'off',

    // General rules - relaxed
    'no-console': 'off',
    'no-debugger': 'off',
    'no-duplicate-imports': 'off',
    'no-unused-expressions': 'off',
    'prefer-const': 'off',
    'no-var': 'off',
    'eqeqeq': 'off',
    'curly': 'off',

    // Import organization
    'sort-imports': 'off',

    // Prettier integration
    'prettier/prettier': ['error', {
      endOfLine: 'auto',
    }],

    // SonarJS rules - all disabled
    'sonarjs/cognitive-complexity': 'off',
    'sonarjs/no-duplicate-string': 'off',
    'sonarjs/no-identical-functions': 'off',
    'sonarjs/no-collapsible-if': 'off',
    'sonarjs/prefer-immediate-return': 'off',
    'sonarjs/no-redundant-jump': 'off',
    'sonarjs/no-small-switch': 'off',
    'sonarjs/no-unused-collection': 'off',
    'sonarjs/no-use-of-empty-return-value': 'off',
    'sonarjs/no-gratuitous-expressions': 'off',
    'sonarjs/no-nested-switch': 'off',
    'sonarjs/no-nested-template-literals': 'off',
    'sonarjs/unused-import': 'off',
    'sonarjs/no-unused-vars': 'off',
    'sonarjs/no-dead-store': 'off',
    'sonarjs/deprecation': 'off',
    'sonarjs/slow-regex': 'off',
    'sonarjs/pseudo-random': 'off',
    'sonarjs/concise-regex': 'off',
    'sonarjs/function-return-type': 'off',
    'sonarjs/no-ignored-exceptions': 'off',
    'sonarjs/different-types-comparison': 'off',
    'sonarjs/no-nested-conditional': 'off',
    'sonarjs/use-type-alias': 'off',
    'sonarjs/no-misleading-array-reverse': 'off',
    'sonarjs/single-character-alternation': 'off',
    'sonarjs/prefer-regexp-exec': 'off',
    'sonarjs/content-length': 'off',
    'sonarjs/prefer-single-boolean-return': 'off',
    'sonarjs/regex-complexity': 'off',
    'sonarjs/no-duplicated-branches': 'off',
    'sonarjs/todo-tag': 'off',
    'sonarjs/encryption-secure-mode': 'off',
    'sonarjs/no-hardcoded-passwords': 'off',
  },
  overrides: [
    {
      // Relax rules for test files
      files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
        'sonarjs/no-duplicate-string': 'off',
        'sonarjs/cognitive-complexity': 'off',
        'sonarjs/no-identical-functions': 'off',
        'sonarjs/no-hardcoded-passwords': 'off',
      },
    },
    {
      // Relax rules for migration/seed scripts
      files: ['**/scripts/**/*.ts', '**/migrations/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
