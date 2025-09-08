import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // ✅ Use babel-jest for both TypeScript and JavaScript
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // ✅ Allow Jest to transform the ES module in node_modules
  transformIgnorePatterns: [
    '/node_modules/(?!@bollo-aggrey/ts-autogen)',
  ],

  // ✅ Map your tsconfig paths
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),

  // ✅ Ensure Jest resolves all relevant file types
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
