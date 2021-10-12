/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  setupFiles: [
    "<rootDir>/tests/env.ts" // set environment variables
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",  // map @ to absolute path,
    "^@tests/(.*)$": "<rootDir>/tests/$1"
  },
};