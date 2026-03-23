import type { Config } from "jest"

const config: Config = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@mlightcad/common$": "<rootDir>/packages/common/src/index.ts",
    "^@mlightcad/geometry-engine$": "<rootDir>/packages/geometry-engine/src/index.ts",
    "^@mlightcad/graphic-interface$": "<rootDir>/packages/graphic-interface/src/index.ts",
    "^@mlightcad/data-model$": "<rootDir>/packages/data-model/src/index.ts",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  testPathIgnorePatterns: [
    "packages/dxf-json/",
  ]
}

export default config
