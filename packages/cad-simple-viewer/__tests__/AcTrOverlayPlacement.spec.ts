import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLine,
  AcDbOsnapMode,
  AcDbUnitsValue,
  AcGeBox2d,
  AcGePoint3d,
  acdbHostApplicationServices,
  acdbWithDatabase
} from '@mlightcad/data-model'
import { AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { acEdDrawingOsnapPoints } from '../src/editor/view/AcEdDrawingGeometry'
import {
  acTrPickDrawingEntities,
  type AcTrDrawingPickSource
} from '../src/view/AcTrDrawingPick'
import type { AcTrLayout } from '../src/view/AcTrLayout'
import { acTrPrepareOverlay } from '../src/view/AcTrOverlay'
import type { AcTrOverlayTransform } from '../src/view/AcTrOverlayOptions'

/**
 * Authored millimetre geometry; unit headers are deliberately independent hints.
 * Inner base (100,200) -> insertion (5000,7000), scale 2, rotation 90 degrees:
 * the 1000-unit line becomes (5000,7000) -> (5000,9000).
 * Outer base (1000,2000) -> insertion (100000,200000):
 * source-WCS endpoints are (104000,205000) -> (104000,207000).
 *
 * This qualifies native plan view: INSERT elevations remain stored but native
 * blockTransform flattens insertion Z. It does not establish 3D placement fidelity.
 */
function drawing(insunits: number, blockUnits: AcDbUnitsValue) {
  const database = new AcDbDatabase()
  return acdbWithDatabase(database, () => {
    database.createDefaultData()
    database.insunits = insunits
    const inner = new AcDbBlockTableRecord({
      name: 'INNER',
      origin: new AcGePoint3d(100, 200, 0),
      blockInsertUnits: blockUnits
    })
    const outer = new AcDbBlockTableRecord({
      name: 'OUTER',
      origin: new AcGePoint3d(1000, 2000, 0),
      blockInsertUnits: blockUnits
    })
    database.tables.blockTable.add(inner)
    database.tables.blockTable.add(outer)
    const line = new AcDbLine(
      { x: 100, y: 200, z: 0 },
      { x: 1100, y: 200, z: 0 }
    )
    inner.appendEntity(line)
    const nested = new AcDbBlockReference('INNER')
    nested.position = { x: 5000, y: 7000, z: 9010.8928 }
    nested.scaleFactors = { x: 2, y: 2, z: 2 }
    nested.rotation = Math.PI / 2
    outer.appendEntity(nested)
    const root = new AcDbBlockReference('OUTER')
    root.position = { x: 100000, y: 200000, z: 250 }
    database.tables.blockTable.modelSpace.appendEntity(root)
    return { database, inner, outer, line, nested, root }
  })
}

function point(value: { x: number; y: number; z?: number }) {
  return { x: value.x, y: value.y, z: value.z ?? 0 }
}

function sourceSnapshot(source: ReturnType<typeof drawing>) {
  return {
    revision: source.database.renderingRevision,
    insunits: source.database.insunits,
    blockUnits: [source.inner.blockInsertUnits, source.outer.blockInsertUnits],
    bases: [point(source.inner.origin), point(source.outer.origin)],
    endpoints: [point(source.line.startPoint), point(source.line.endPoint)],
    insertions: [point(source.nested.position), point(source.root.position)],
    scales: [
      point(source.nested.scaleFactors),
      point(source.root.scaleFactors)
    ],
    rotations: [source.nested.rotation, source.root.rotation]
  }
}

function pick(source: AcTrDrawingPickSource, x: number, y: number) {
  const radius = 0.1
  const aperture = new AcGeBox2d().setFromPoints([
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y + radius }
  ])
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)
  camera.position.set(x, y, 100)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  const ray = new THREE.Raycaster()
  ray.setFromCamera(new THREE.Vector2(), camera)
  ray.params.Line.threshold = radius
  return acTrPickDrawingEntities(source, aperture, ray).filter(
    hit => hit.entity instanceof AcDbLine
  )
}

function expectPoint(
  actual: { x: number; y: number; z: number },
  x: number,
  y: number
) {
  expect(actual.x).toBeCloseTo(x, 6)
  expect(actual.y).toBeCloseTo(y, 6)
  expect(actual.z).toBeCloseTo(0, 6)
}

describe('native overlay anchored placement qualification', () => {
  // Match the native test-owner convention: preserve an uninitialized service
  // as well as a live working database; its public getter deliberately throws.
  const services = acdbHostApplicationServices() as unknown as {
    _workingDatabase: AcDbDatabase | null
    workingDatabase: AcDbDatabase
  }
  let renderer: AcTrRenderer
  let host: AcDbDatabase
  let previousDatabase: AcDbDatabase | null
  let layouts: AcTrLayout[] = []

  beforeEach(() => {
    layouts = []
    previousDatabase = services._workingDatabase
    host = new AcDbDatabase()
    acdbWithDatabase(host, () => host.createDefaultData())
    services.workingDatabase = host
    renderer = new AcTrRenderer({
      getSize: (size: THREE.Vector2) => size.set(800, 600)
    } as THREE.WebGLRenderer)
    renderer.context.database = host
  })
  afterEach(() => {
    layouts.forEach(layout => layout.clear())
    renderer?.dispose()
    services._workingDatabase = previousDatabase
  })

  async function prepare(
    source: ReturnType<typeof drawing>,
    transform: AcTrOverlayTransform
  ): Promise<AcTrDrawingPickSource> {
    const layout = await acTrPrepareOverlay(renderer, source.database, {
      transform
    })
    layouts.push(layout)
    return {
      database: source.database,
      layout,
      referenceId: 'placed',
      isCurrent: () => true
    }
  }

  it.each([
    [0, AcDbUnitsValue.Undefined],
    [4, AcDbUnitsValue.Inches],
    [6, AcDbUnitsValue.Millimeters],
    [999, AcDbUnitsValue.Meters]
  ])(
    'applies resolved units once despite INSUNITS=%s and block units=%s',
    async (insunits, blockUnits) => {
      const source = drawing(insunits, blockUnits)
      expect(source.database.insunits).toBe(insunits)
      expect(source.inner.blockInsertUnits).toBe(blockUnits)
      expect(source.outer.blockInsertUnits).toBe(blockUnits)
      const original = sourceSnapshot(source)
      const hostRevision = host.renderingRevision
      // Core-resolved placement: source anchor (104000,205000) in mm maps to
      // target anchor (600000,7300000) in metres after a second 90-degree turn.
      // Expected constants below are independently calculated fixture coordinates.
      const placed = await prepare(source, {
        position: { x: 600205, y: 7299896, z: 0 },
        scale: 0.001,
        rotationRad: Math.PI / 2
      })
      expect(placed.layout.box.min.x).toBeCloseTo(104000, 6)
      expect(placed.layout.box.max.x).toBeCloseTo(104000, 6)
      expect(placed.layout.box.min.y).toBeCloseTo(205000, 6)
      expect(placed.layout.box.max.y).toBeCloseTo(207000, 6)
      const displayedBounds = placed.layout.box
        .clone()
        .applyMatrix4(placed.layout.internalObject.matrixWorld)
      expect(displayedBounds.min.x).toBeCloseTo(599998, 6)
      expect(displayedBounds.max.x).toBeCloseTo(600000, 6)
      expect(displayedBounds.min.y).toBeCloseTo(7300000, 6)
      expect(displayedBounds.max.y).toBeCloseTo(7300000, 6)

      const hits = pick(placed, 599999, 7300000)
      expect(hits).toHaveLength(1)
      const hit = hits[0]
      expect(hit.referenceId).toBe('placed')
      expect(hit.database).toBe(source.database)
      expect(hit.entity).toBe(source.line)
      expect(hit.rootId).toBe(source.root.objectId)
      expect(hit.path).toEqual([source.nested.objectId, source.line.objectId])
      expect(hit.isCurrent()).toBe(true)
      const endpoints = acEdDrawingOsnapPoints(hit, AcDbOsnapMode.EndPoint, {
        x: 599999,
        y: 7300000,
        z: 0
      })
      expect(endpoints).toHaveLength(2)
      expectPoint(endpoints[0], 600000, 7300000)
      expectPoint(endpoints[1], 599998, 7300000)
      expect(endpoints[0].distanceTo(endpoints[1])).toBeCloseTo(2, 6)
      expect(pick(placed, 104000, 206000)).toEqual([])
      expect(sourceSnapshot(source)).toEqual(original)
      expect(renderer.context.database).toBe(host)
      expect(acdbHostApplicationServices().workingDatabase).toBe(host)
      expect(host.renderingRevision).toBe(hostRevision)
      expect([...host.tables.blockTable.modelSpace.newIterator()]).toEqual([])
    }
  )

  it('accepts resolved US survey foot placement without assuming metre target coordinates', async () => {
    const source = drawing(0, AcDbUnitsValue.Undefined)
    const original = sourceSnapshot(source)
    // Target anchor (100,200) in US survey feet. One foot is exactly 1200/3937 m;
    // a 2 m source span therefore measures 6.561666666666667 target units.
    const placed = await prepare(source, {
      position: { x: 772.5708333333333, y: -141.20666666666665, z: 0 },
      scale: 0.0032808333333333334,
      rotationRad: Math.PI / 2
    })
    const hits = pick(placed, 97, 200)
    expect(hits).toHaveLength(1)
    const endpoints = acEdDrawingOsnapPoints(hits[0], AcDbOsnapMode.EndPoint, {
      x: 97,
      y: 200,
      z: 0
    })
    expect(endpoints).toHaveLength(2)
    expectPoint(endpoints[0], 100, 200)
    expectPoint(endpoints[1], 93.43833333333333, 200)
    expect(endpoints[0].distanceTo(endpoints[1])).toBeCloseTo(
      6.561666666666667,
      7
    )
    expect(sourceSnapshot(source)).toEqual(original)
  })
})
