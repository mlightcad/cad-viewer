jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {}
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class AcEdPreviewJig {
    constructor(_view: unknown) {}
  }

  class MockKeywordCollection {
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }

  class AcEdPromptPointOptions {
    keywords = new MockKeywordCollection()
    constructor(readonly message: string) {}
  }

  class AcEdPromptDistanceOptions {
    constructor(readonly message: string) {}
  }

  class AcEdPromptKeywordOptions {
    keywords = new MockKeywordCollection()
    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: { Write: 8 },
    AcEdPreviewJig,
    AcEdPromptDistanceOptions,
    AcEdPromptKeywordOptions,
    AcEdPromptPointOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel',
      None: 'None'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import { AcDbPolyline, AcGePoint2d } from '@mlightcad/data-model'

import {
  buildRevCloud,
  defaultRevCloudArcLength,
  distance2d,
  ensureCounterClockwise,
  isRevCloudCloseToStart,
  rectanglePath,
  REVCLOUD_BULGE,
  signedArea
} from '../src/command/review/AcApRevCloudGeom'
import {
  accumulateSketchPoint,
  simplifySketchPoints
} from '../src/command/draw/AcApSketchCmd'

describe('AcApRevCloudGeom', () => {
  test('rectanglePath is counterclockwise', () => {
    const path = rectanglePath({ x: 0, y: 2 }, { x: 4, y: 0 })
    expect(path).toHaveLength(4)
    expect(signedArea(path)).toBeGreaterThan(0)
    expect(path[0]).toEqual(new AcGePoint2d(0, 0))
    expect(path[2]).toEqual(new AcGePoint2d(4, 2))
  })

  test('ensureCounterClockwise reverses clockwise polygons', () => {
    const clockwise = [
      new AcGePoint2d(0, 0),
      new AcGePoint2d(0, 2),
      new AcGePoint2d(2, 2),
      new AcGePoint2d(2, 0)
    ]
    const oriented = ensureCounterClockwise(clockwise)
    expect(signedArea(oriented)).toBeGreaterThan(0)
  })

  test('buildRevCloud creates a closed polyline of outward arcs', () => {
    const cloud = new AcDbPolyline()
    const path = rectanglePath({ x: 0, y: 0 }, { x: 10, y: 10 })
    const built = buildRevCloud(cloud, path, true, { arcLength: 2 })
    expect(built).toBe(true)
    expect(cloud.closed).toBe(true)
    expect(cloud.numberOfVertices).toBeGreaterThanOrEqual(3)

    const getBulgeAt = (
      cloud as unknown as { getBulgeAt?: (index: number) => number }
    ).getBulgeAt
    if (getBulgeAt) {
      expect(getBulgeAt.call(cloud, 0)).toBeCloseTo(REVCLOUD_BULGE)
    }
  })

  test('buildRevCloud reverse option negates bulge', () => {
    const cloud = new AcDbPolyline()
    const path = rectanglePath({ x: 0, y: 0 }, { x: 10, y: 10 })
    buildRevCloud(cloud, path, true, { arcLength: 2, reverse: true })
    const getBulgeAt = (
      cloud as unknown as { getBulgeAt?: (index: number) => number }
    ).getBulgeAt
    if (getBulgeAt) {
      expect(getBulgeAt.call(cloud, 0)).toBeCloseTo(-REVCLOUD_BULGE)
    }
  })

  test('isRevCloudCloseToStart uses half the arc length', () => {
    expect(isRevCloudCloseToStart({ x: 0, y: 0 }, { x: 0.4, y: 0 }, 1)).toBe(
      true
    )
    expect(isRevCloudCloseToStart({ x: 0, y: 0 }, { x: 0.6, y: 0 }, 1)).toBe(
      false
    )
  })

  test('defaultRevCloudArcLength is a fraction of the view diagonal', () => {
    const view = {
      width: 100,
      height: 100,
      screenToWorld: ({ x, y }: { x: number; y: number }) => ({ x, y })
    }
    const length = defaultRevCloudArcLength(view as never)
    expect(length).toBeCloseTo(Math.hypot(100, 100) * 0.005)
  })

  test('distance2d matches hypot', () => {
    expect(distance2d({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})

describe('AcApSketchCmd helpers', () => {
  test('accumulateSketchPoint ignores moves shorter than the increment', () => {
    const points = [new AcGePoint2d(0, 0)]
    expect(accumulateSketchPoint(points, { x: 0.05, y: 0 }, 0.1)).toBe(false)
    expect(points).toHaveLength(1)
    expect(accumulateSketchPoint(points, { x: 0.2, y: 0 }, 0.1)).toBe(true)
    expect(points).toHaveLength(2)
  })

  test('simplifySketchPoints keeps first, last, and tolerance-spaced points', () => {
    const simplified = simplifySketchPoints(
      [
        { x: 0, y: 0 },
        { x: 0.1, y: 0 },
        { x: 1, y: 0 },
        { x: 1.05, y: 0 },
        { x: 2, y: 0 }
      ],
      0.5
    )
    expect(simplified.map(p => [p.x, p.y])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0]
    ])
  })
})
