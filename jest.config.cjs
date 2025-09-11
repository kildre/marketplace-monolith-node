// jest.config.cjs
const { pathsToModuleNameMapper } = require('ts-jest');
const appTsconfig = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Compile .ts/.tsx with ts-jest and override just what's needed for tests
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Inline tsconfig overrides for the test environment
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          types: ['jest', 'node'],
          isolatedModules: false,   // let ts-jest do full type transforms
          // Optional but often helpful in mixed ESM/CJS repos:
          esModuleInterop: true
        },
        useESM: false
        // diagnostics: true, // uncomment if you want detailed TS diagnostics in tests
      }
    ],
  },

  // Map TS path aliases from your main tsconfig
  moduleNameMapper: pathsToModuleNameMapper(
    appTsconfig.compilerOptions?.paths || {},
    { prefix: '<rootDir>/' } // with your "baseUrl": ".", this resolves "src/*" -> "<rootDir>/src/*"
  ),

  // If you need to transpile specific ESM packages in node_modules, list them here
  transformIgnorePatterns: ['/node_modules/(?!@bollo-aggrey/ts-autogen)'],

  // Limit test roots if you want (adjust to your layout)
  roots: ['<rootDir>/src/test'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Optional: make Jest’s test file detection explicit
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
};
