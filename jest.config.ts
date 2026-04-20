import type { Config } from "jest"

const config: Config = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  testPathIgnorePatterns: [
    "packages/dxf-json/",
    "/e2e/",
  ],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
  },
}

export default config
