/* eslint quote-props: 'off' */
/* eslint import/no-extraneous-dependencies: off */
const js = require('@eslint/js');
const globals = require('globals');
const importPlugin = require('eslint-plugin-import');
const airbnbBase = require('eslint-config-airbnb-base');
const jestPlugin = require('eslint-plugin-jest');

// костыль: вытаскиваем все правила из вложенных файлов airbnb-base
function extractAirbnbRules(config) {
  return config.extends
    .map(require)
    .map((cfg) => cfg.rules || {})
    .reduce((acc, cur) => ({ ...acc, ...cur }), {});
}

const myRules = {
  'brace-style': ['warn', 'stroustrup', { allowSingleLine: true }],
  'camelcase': 'off',
  // 'camelcase': ['error', { properties: 'never', ignoreDestructuring: true, ignoreImports: true }],
  'comma-dangle': ['error', 'only-multiline'],
  'consistent-return': 'off',
  'default-case': 'off',
  'default-param-last': 'off',
  'global-require': 'off',
  'function-paren-newline': 'off',
  // 'function-paren-newline': ['warn', 'never'],
  'max-len': ['warn', { code: 512 }],
  'no-cond-assign': ['error', 'except-parens'],
  'no-console': 'off',
  'no-nested-ternary': 'off',
  'implicit-arrow-linebreak': 'off',
  'import/no-dynamic-require': 'off',
  'import/newline-after-import': 'off',
  'import/order': 'off',
  'no-else-return': 'off',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-multiple-empty-lines': ['warn', { max: 2 }],
  'no-new-func': 'off',
  'no-param-reassign': 'off',
  'no-promise-executor-return': 'off',
  'no-throw-literal': 'off',
  'no-trailing-spaces': ['warn', { skipBlankLines: true, ignoreComments: true }],
  'no-underscore-dangle': 'off',
  'no-unused-vars': ['warn', { vars: 'all', args: 'after-used', ignoreRestSiblings: true }],
  'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
  'object-curly-newline': 'off',
  'one-var-declaration-per-line': 'off',
  'one-var': 'off',
  'operator-linebreak': 'off',
  'padded-blocks': ['off'],
  'prefer-const': 'warn',
  'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
  'radix': 'off',
  'space-infix-ops': 'off',
  'prefer-destructuring': ['error', {
    VariableDeclarator: {
      array: false,
      object: true,
    },
    AssignmentExpression: {
      array: false,
      object: false,
    },
  }],

};


module.exports = [
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        // for jest
        expect: 'readonly',
        test: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        ...globals.node
      }
    },
    plugins: {
      js,
      import: importPlugin,
      jest: jestPlugin
    },
    rules: {
      ...js.configs.recommended.rules,
      // ...airbnbBase.rules,
      ...extractAirbnbRules(airbnbBase),
      ...myRules,
    },
  },
];
