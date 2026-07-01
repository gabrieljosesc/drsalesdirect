import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Load next.config + .env files into the test environment
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  // Pure business-logic tests run in node (no jsdom needed). Switch to
  // 'jsdom' + @testing-library/react if/when component tests are added.
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
