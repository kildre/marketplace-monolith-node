// jest.config.cjs
const { pathsToModuleNameMapper } = require('ts-jest');
const appTsconfig = require('./tsconfig.json');

const tsTransform = {
  '^.+\\.tsx?$': [
    'ts-jest',
    {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'Node',
        target: 'ES2020',
        types: ['jest', 'node'],
        esModuleInterop: true,
        isolatedModules: false,
      },
      useESM: false,
      // diagnostics: true, // uncomment to see detailed TS diagnostics in tests
    },
  ],
};

// Shared across projects
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: tsTransform,
  moduleNameMapper: pathsToModuleNameMapper(
    appTsconfig.compilerOptions?.paths || {},
    { prefix: '<rootDir>/' }
  ),
  transformIgnorePatterns: ['/node_modules/(?!@bollo-aggrey/ts-autogen)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  clearMocks: true,
  restoreMocks: true,
};

module.exports = {
  // Two Jest projects: unit (parallel), integration (serial w/ setup)
  projects: [
    {
      displayName: 'unit',
      ...baseConfig,
      roots: ['<rootDir>/src'],
      testMatch: ['**/test/**/*.unit.test.(ts|tsx|js)'],
      testPathIgnorePatterns: ['\\.int\\.test\\.(ts|tsx|js)$', '/dist/'],
    },
    {
      displayName: 'integration',
      ...baseConfig,
      // Keep DB tests isolated & predictable
      runInBand: true,
      // Give Testcontainers/DB time to start
      testTimeout: 30000,
      roots: ['<rootDir>/src'],
      testMatch: ['**/test/**/*.int.test.(ts|tsx|js)'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup-db.ts'],
      testPathIgnorePatterns: ['/dist/'],
    },
  ],
};
