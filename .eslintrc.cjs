module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  rules: {
    'import/order': [
      'error',
      {
        'groups': ['builtin', 'external', 'internal'],
        'newlines-between': 'always',
      },
    ],
    'import/no-default-export': 'error',
  },
  overrides: [
    {
      files: ['*.cjs'],
      env: {
        commonjs: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  ignorePatterns: ['/dist'],
};
