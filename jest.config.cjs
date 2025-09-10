// jest.config.cjs
const { pathsToModuleNameMapper } = require('ts-jest');
const appTsconfig = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Compile .ts/.tsx with ts-jest
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json', useESM: false }],
  },

  // Only if you have TS path aliases
  moduleNameMapper: pathsToModuleNameMapper(appTsconfig.compilerOptions?.paths || {}, {
    prefix: '<rootDir>/',
  }),

  // If you need to transpile a specific ESM package in node_modules
  transformIgnorePatterns: ['/node_modules/(?!@bollo-aggrey/ts-autogen)'],

  // (Optional) limit test roots; adjust if yours differ
  roots: ['<rootDir>/src/test'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
