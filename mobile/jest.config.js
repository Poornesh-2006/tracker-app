module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleNameMapper: {
    // Real SQL via node:sqlite and an in-memory keychain (see test-support/).
    '^expo-sqlite$': '<rootDir>/test-support/expo-sqlite.ts',
    '^expo-secure-store$': '<rootDir>/test-support/expo-secure-store.ts',
    '^@/(.*)$': '<rootDir>/$1',
  },
};
