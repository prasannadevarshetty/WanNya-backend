module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'config/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js'
  ],
  coverageReporters: ['text', 'lcov'],
  clearMocks: true,
  restoreMocks: true
};
