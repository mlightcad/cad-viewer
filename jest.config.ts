import type { Config } from 'jest'

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        // TS5097: os módulos de `apps/freedom-mobile` (node --test) importam com
        // extensão `.ts`; o jest resolve-os em runtime, só o diagnóstico recusa.
        diagnostics: { ignoreCodes: [5097] }
      }
    ],
    '^.+\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true
        }
      }
    ]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!.*(mtext-parser|rbush|quickselect))'
  ],
  testPathIgnorePatterns: ['/e2e/', '/__tests__/helpers/'],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
    '^@mlightcad/cad-simple-viewer$':
      '<rootDir>/packages/cad-simple-viewer/src/index.ts',
    '^@mlightcad/cad-simple-viewer/icons$':
      '<rootDir>/packages/cad-simple-viewer/src/ui/icons.ts',
    '^@mlightcad/cad-simple-viewer/find$':
      '<rootDir>/packages/cad-simple-viewer/src/find/index.ts',
    '^three/examples/jsm/lines/LineMaterial\\.js$':
      '<rootDir>/test/mocks/three/LineMaterial.js',
    '^three/examples/jsm/lines/LineSegments2\\.js$':
      '<rootDir>/test/mocks/three/LineSegments2.js',
    '^three/examples/jsm/lines/LineSegmentsGeometry\\.js$':
      '<rootDir>/test/mocks/three/LineSegmentsGeometry.js',
    '^three/examples/jsm/renderers/CSS2DRenderer\\.js$':
      '<rootDir>/test/mocks/three/CSS2DRenderer.js',
    '^three/examples/jsm/utils/BufferGeometryUtils\\.js$':
      '<rootDir>/test/mocks/three/BufferGeometryUtils.js',
    '^three/examples/jsm/controls/OrbitControls(\\.js)?$':
      '<rootDir>/test/mocks/three/OrbitControls.js'
  }
}

export default config
