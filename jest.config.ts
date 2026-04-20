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
    '^three/examples/jsm/lines/LineMaterial\\.js$':
      '<rootDir>/test/mocks/three/LineMaterial.js',
  },
}

export default config
