module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/mockRedis.js', '<rootDir>/tests/setup/quietLogs.js'],
  clearMocks: true,
  coveragePathIgnorePatterns: ['/node_modules/', '/mocks/'],
  testMatch: ['**/tests/**/*.test.js'],
};
