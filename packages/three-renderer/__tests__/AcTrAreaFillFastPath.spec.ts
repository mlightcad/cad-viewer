import {
  AcDbSolid,
  AcDbTrace,
  AcGeArea2d,
  AcGeIndexNode,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3dLike,
  AcGePolyline2d
} from '@mlightcad/data-model'
import * as THREE from 'three'

import {
  type AcTrBuiltDirectGeometry,
  buildAreaGeometry,
  getAreaBuildStats,
  resetAreaBuildStats,
  setForceGeneralAreaPath
} from '../src/object/AcTrLineGeometryBuilder'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

/** Absolute area tolerance in squared drawing units (float32 output). */
const AREA_TOLERANCE = 1e-4
/**
 * Gauss-Krüger style drawing coordinate. float32 ulp here is 2 units, so any
 * tolerance below that proves the fast path did not lose WCS precision.
 */
const LARGE = 39_652_926.8

/** Builds a fake area whose single loop is exactly `points`. */
function areaFromLoop(points: AcGePoint2dLike[]): AcGeArea2d {
  const loop = points.map(point => new AcGePoint2d(point.x, point.y))
  const hierarchy: AcGeIndexNode = {
    index: -1,
    children: [{ index: 0, children: [] }]
  }
  // Fake area implements both legacy (getPoints/buildHierarchy) and modern
  // (tessellate) APIs so AcTrPolygon's general path works alongside the fast
  // path's API auto-detection.
  return {
    getPoints: () => [loop],
    tessellate: () => [loop],
    buildHierarchy: () => hierarchy
  } as unknown as AcGeArea2d
}

/** Builds a real closed polyline area, as `AcDbTrace.subWorldDraw` does. */
function areaFromVertices(vertices: AcGePoint2dLike[]): AcGeArea2d {
  const polyline = new AcGePolyline2d(
    vertices.map(point => new AcGePoint2d(point.x, point.y)),
    true
  )
  const area = new AcGeArea2d()
  area.add(polyline)
  return area
}

/** Axis-aligned rectangle in the canonical SOLID corner order. */
function rectangle(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): AcGePoint2dLike[] {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ]
}

/** Reads one geometry into local-space triangles. */
function localTriangles(geometry: THREE.BufferGeometry): number[][][] {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const index = geometry.getIndex() as THREE.BufferAttribute
  const triangles: number[][][] = []
  for (let i = 0; i < index.count; i += 3) {
    const triangle: number[][] = []
    for (let k = 0; k < 3; k++) {
      const vertex = index.getX(i + k)
      triangle.push([
        position.getX(vertex),
        position.getY(vertex),
        position.getZ(vertex)
      ])
    }
    triangles.push(triangle)
  }
  return triangles
}

/** Signed area of one planar triangle in X/Y. */
function signedTriangleArea(a: number[], b: number[], c: number[]): number {
  return ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * 0.5
}

/** Total covered area of an indexed triangle geometry. */
function totalArea(built: AcTrBuiltDirectGeometry): number {
  let total = 0
  for (const triangle of localTriangles(built.geometry)) {
    total += Math.abs(signedTriangleArea(triangle[0], triangle[1], triangle[2]))
  }
  return total
}

/** Every world-space vertex key referenced by at least one triangle. */
function usedVertexKeys(built: AcTrBuiltDirectGeometry): Set<string> {
  const keys = new Set<string>()
  const position = built.geometry.getAttribute(
    'position'
  ) as THREE.BufferAttribute
  const index = built.geometry.getIndex() as THREE.BufferAttribute
  for (let i = 0; i < index.count; i++) {
    const vertex = index.getX(i)
    keys.add(
      `${(position.getX(vertex) + built.worldOffset.x).toFixed(3)},${(
        position.getY(vertex) + built.worldOffset.y
      ).toFixed(3)}`
    )
  }
  return keys
}

/**
 * Builds one area through {@link buildAreaGeometry} and asserts it produced
 * mesh geometry.
 */
function build(
  area: AcGeArea2d,
  context: AcTrRenderContext,
  traits = defaultTraits
): AcTrBuiltDirectGeometry {
  const built = buildAreaGeometry(area, traits, context)
  expect(built).not.toBeNull()
  if (!built) {
    throw new Error('buildAreaGeometry returned null')
  }
  return built
}

/**
 * Asserts the fast path and the general path describe the same filled region:
 * identical covered area, identical used vertices, identical WCS bounds and
 * offset, and the same front-facing triangle winding.
 */
function expectSameFill(
  fast: AcTrBuiltDirectGeometry,
  general: AcTrBuiltDirectGeometry
) {
  const fastArea = totalArea(fast)
  const generalArea = totalArea(general)
  expect(fastArea).toBeGreaterThan(AREA_TOLERANCE)
  expect(Math.abs(fastArea - generalArea)).toBeLessThan(AREA_TOLERANCE)

  expect(usedVertexKeys(fast)).toEqual(usedVertexKeys(general))

  const winding = (built: AcTrBuiltDirectGeometry) => {
    const signs = new Set(
      localTriangles(built.geometry).map(triangle =>
        Math.sign(signedTriangleArea(triangle[0], triangle[1], triangle[2]))
      )
    )
    expect(signs.size).toBe(1)
    expect(signs.has(0)).toBe(false)
    return [...signs][0]
  }
  expect(winding(fast)).toBe(winding(general))

  expect(fast.wcsBbox.min.x).toBe(general.wcsBbox.min.x)
  expect(fast.wcsBbox.min.y).toBe(general.wcsBbox.min.y)
  expect(fast.wcsBbox.max.x).toBe(general.wcsBbox.max.x)
  expect(fast.wcsBbox.max.y).toBe(general.wcsBbox.max.y)
  expect(fast.worldOffset.x).toBe(general.worldOffset.x)
  expect(fast.worldOffset.y).toBe(general.worldOffset.y)
  expect(fast.material).toBe(general.material)
}

/**
 * Builds the same area twice — once through the shipped fast path and once
 * forced through the general path — and compares the two outputs.
 *
 * The general path is forced with the builder's test-only seam so both builds
 * receive identical traits and therefore resolve the same material.
 */
function expectFastPathMatchesGeneral(area: AcGeArea2d) {
  // One shared context so the style-cache material instance is identical.
  const context = new AcTrRenderContext()
  resetAreaBuildStats()
  const fast = build(area, context)
  expect(getAreaBuildStats()).toEqual({
    smallLoopFastPath: 1,
    generalPath: 0
  })

  resetAreaBuildStats()
  setForceGeneralAreaPath(true)
  let general: AcTrBuiltDirectGeometry
  try {
    general = build(area, context)
  } finally {
    setForceGeneralAreaPath(false)
  }
  expect(getAreaBuildStats()).toEqual({
    smallLoopFastPath: 0,
    generalPath: 1
  })

  expectSameFill(fast, general)
  fast.geometry.dispose()
  general.geometry.dispose()
}

describe('buildAreaGeometry single-loop fast path', () => {
  it('matches the general path for a clockwise rectangle (edge-loop hatch)', () => {
    expectFastPathMatchesGeneral(
      areaFromLoop([
        { x: 0, y: 0 },
        { x: 0, y: 6 },
        { x: 10, y: 6 },
        { x: 10, y: 0 }
      ])
    )
  })

  it('matches the general path for a closed rectangle loop (SOLID quad)', () => {
    expectFastPathMatchesGeneral(areaFromVertices(rectangle(0, 0, 10, 6)))
  })

  it('matches the general path for an open four-point rectangle loop', () => {
    expectFastPathMatchesGeneral(areaFromLoop(rectangle(2, 3, 12, 9)))
  })

  it('matches the general path for a rotated rectangle', () => {
    const side = Math.SQRT2 * 10
    expectFastPathMatchesGeneral(
      areaFromLoop([
        { x: 0, y: 0 },
        { x: side, y: side },
        { x: 0, y: 2 * side },
        { x: -side, y: side }
      ])
    )
  })

  it('matches the general path when the quad degenerates to a triangle', () => {
    // SOLID whose corners 3 and 4 coincide: three distinct points.
    expectFastPathMatchesGeneral(
      areaFromLoop([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 4, y: 6 },
        { x: 4, y: 6 }
      ])
    )
  })

  it('matches the general path for a loop with a duplicated closing point', () => {
    expectFastPathMatchesGeneral(
      areaFromLoop([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 6 },
        { x: 0, y: 6 },
        { x: 0, y: 0 }
      ])
    )
  })

  it('matches the general path for a concave quad (wrong fan would add area)', () => {
    // Diagonal 0→2 covers the triangle (0,0)-(10,0)-(10,10) = 50 plus the
    // thin (0,0)-(10,10)-(0,1) sliver = 5, so it covers 5 units of area
    // outside the concave polygon. Diagonal 1→3 is the correct split.
    const area = areaFromLoop([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 1 }
    ])
    expectFastPathMatchesGeneral(area)

    const fast = build(area, new AcTrRenderContext())
    expect(totalArea(fast)).toBeCloseTo(55, 3)
    fast.geometry.dispose()
  })

  it('keeps large drawing coordinates precise in both paths', () => {
    expectFastPathMatchesGeneral(
      areaFromLoop(rectangle(LARGE, LARGE, LARGE + 8, LARGE + 6))
    )
  })

  it('falls back to the general path for a curved loop', () => {
    resetAreaBuildStats()
    const curved = new AcGePolyline2d(
      [
        { x: 0, y: 0, bulge: 1 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ],
      true
    )
    const area = new AcGeArea2d()
    area.add(curved)

    const built = build(area, new AcTrRenderContext())
    expect(built.geometry.getAttribute('position').count).toBeGreaterThan(4)
    expect(getAreaBuildStats()).toEqual({
      smallLoopFastPath: 0,
      generalPath: 1
    })
    built.geometry.dispose()
  })

  it('leaves self-intersecting quads to the general path', () => {
    // Crossing loops have no well-defined triangulation. The fast path bails
    // out so earcut keeps deciding, instead of the builder inventing a fill
    // for a loop whose fill is undefined.
    const crossing = areaFromLoop([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
      { x: 4, y: 3 }
    ])
    resetAreaBuildStats()
    const built = buildAreaGeometry(
      crossing,
      defaultTraits,
      new AcTrRenderContext()
    )
    expect(getAreaBuildStats()).toEqual({
      smallLoopFastPath: 0,
      generalPath: 1
    })
    // Pin whatever earcut produces today so a future earcut change is visible.
    expect(built).not.toBeNull()
    if (built) {
      expect(totalArea(built)).toBeCloseTo(6, 3)
      built.geometry.dispose()
    }
  })

  it('falls back to the general path when the loop has a hole', () => {
    resetAreaBuildStats()
    const outer = [
      new AcGePoint2d(0, 0),
      new AcGePoint2d(10, 0),
      new AcGePoint2d(10, 10),
      new AcGePoint2d(0, 10)
    ]
    const inner = [
      new AcGePoint2d(4, 4),
      new AcGePoint2d(6, 4),
      new AcGePoint2d(6, 6),
      new AcGePoint2d(4, 6)
    ]
    const area = {
      getPoints: () => [outer, inner],
      tessellate: () => [outer, inner],
      buildHierarchy: (): AcGeIndexNode => ({
        index: -1,
        children: [{ index: 0, children: [{ index: 1, children: [] }] }]
      })
    } as unknown as AcGeArea2d

    const built = build(area, new AcTrRenderContext())
    expect(getAreaBuildStats()).toEqual({
      smallLoopFastPath: 0,
      generalPath: 1
    })
    // Outer 100 minus the 4-unit hole.
    expect(totalArea(built)).toBeCloseTo(96, 3)
    built.geometry.dispose()
  })
})

describe('AcDbSolid / AcDbTrace fill capacity', () => {
  /** Creates a SOLID/Trace whose corners 3/4 coincide for a 3-corner solid. */
  function createSolid(cornerCount: number) {
    const solid = new AcDbSolid()
    const corners = rectangle(0, 0, 10, 6)
    for (let i = 0; i < 4; i++) {
      const corner = corners[i < cornerCount ? i : cornerCount - 1]
      solid.setPointAt(i, {
        x: corner.x,
        y: corner.y,
        z: 0
      } as unknown as AcGePoint3dLike)
    }
    return solid
  }

  it('routes every solid corner count through the fast path', () => {
    for (const cornerCount of [3, 4]) {
      const solid = createSolid(cornerCount)
      resetAreaBuildStats()
      const built = build(
        areaFromVertices(solid.subGetGripPoints()),
        new AcTrRenderContext()
      )
      expect(getAreaBuildStats()).toEqual({
        smallLoopFastPath: 1,
        generalPath: 0
      })
      // 3 corners → one triangle; 4 corners → two.
      expect(built.geometry.getIndex()!.count).toBe(cornerCount === 3 ? 3 : 6)
      built.geometry.dispose()
    }
  })

  it('matches the general path for a real AcDbTrace boundary', () => {
    const trace = new AcDbTrace()
    const corners = rectangle(0, 0, 10, 6)
    for (let i = 0; i < 4; i++) {
      trace.setPointAt(i, {
        x: corners[i].x,
        y: corners[i].y,
        z: 0
      } as unknown as AcGePoint3dLike)
    }

    expectFastPathMatchesGeneral(areaFromVertices(trace.subGetGripPoints()))
  })
})
