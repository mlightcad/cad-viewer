import type { Config } from 'jest'

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testPathIgnorePatterns: ['packages/dxf-json/', '/e2e/'],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
    '^three/examples/jsm/lines/LineMaterial\\.js$':
      '<rootDir>/test/mocks/three/LineMaterial.js',
    '^three/examples/jsm/lines/LineSegments2\\.js$':
      '<rootDir>/test/mocks/three/LineSegments2.js',
    '^three/examples/jsm/lines/LineSegmentsGeometry\\.js$':
      '<rootDir>/test/mocks/three/LineSegmentsGeometry.js',
    '^three/examples/jsm/renderers/CSS2DRenderer\\.js$':
      '<rootDir>/test/mocks/three/CSS2DRenderer.js',
    '^three/examples/jsm/utils/BufferGeometryUtils\\.js$':
      '<rootDir>/test/mocks/three/BufferGeometryUtils.js'
  }
}

export default config
