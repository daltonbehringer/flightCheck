const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './'
});

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx']
};

module.exports = createJestConfig(customJestConfig);
