import {
  ACEX_SNAPSHOT_VERSION,
  acexHtmlBuildSnapshotFromExportScene,
  acexHtmlCollectBatchesFromObject3D
} from '@mlightcad/cad-html-core'
import type { AcDbDatabase } from '@mlightcad/data-model'
import * as THREE from 'three'

/**
 * Guards the export-time per-layout fit box that the offline viewer uses for
 * initial framing and for toolbar "Extents" on every layout tab.
 */

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

function lineObject(minX: number, minY: number, maxX: number, maxY: number) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(f32([minX, minY, 0, maxX, maxY, 0]), 3)
  )
  const material = new THREE.LineBasicMaterial()
  const line = new THREE.LineSegments(geometry, material)
  line.userData = { layer: '0' }
  return line
}

function fakeDatabase(): AcDbDatabase {
  return {
    extmin: { x: -5000, y: -5000 },
    extmax: { x: 5000, y: 5000 },
    insunits: 4,
    lunits: 2,
    luprec: 4,
    aunits: 0,
    auprec: 0,
    measurement: 1,
    ltscale: 1,
    angbase: 0,
    angdir: 0,
    objects: { layout: { newIterator: () => [][Symbol.iterator]() } },
    tables: {
      blockTable: { newIterator: () => [][Symbol.iterator]() }
    }
  } as unknown as AcDbDatabase
}

describe('export-time layout fit extents', () => {
  it('persists a fit box per layout, not only for the active one', () => {
    const modelRoot = new THREE.Group()
    modelRoot.add(lineObject(0, 0, 400, 200))
    const paperRoot = new THREE.Group()
    paperRoot.add(lineObject(1000, 1000, 1100, 1050))

    const snapshot = acexHtmlBuildSnapshotFromExportScene(
      fakeDatabase(),
      {
        layers: [{ name: '0', color: 0xffffff, visible: true }],
        layouts: [
          {
            btrId: 'ms',
            isModelSpace: true,
            layers: [{ name: '0', root: modelRoot }]
          },
          {
            btrId: 'ps',
            isModelSpace: false,
            layers: [{ name: '0', root: paperRoot }]
          }
        ],
        activeLayoutBtrId: 'ps',
        modelSpaceBtrId: 'ms'
      },
      { viewerMode: 'view' }
    )

    expect(snapshot.version).toBe(ACEX_SNAPSHOT_VERSION)
    // The active layout is paper space, but model space keeps its own box.
    expect(snapshot.layouts[0]?.fitExtents).toEqual({
      minX: 0,
      minY: 0,
      maxX: 400,
      maxY: 200
    })
    expect(snapshot.layouts[1]?.fitExtents).toEqual({
      minX: 1000,
      minY: 1000,
      maxX: 1100,
      maxY: 1050
    })
    expect(snapshot.meta.viewExtents).toEqual({
      minX: 1000,
      minY: 1000,
      maxX: 1100,
      maxY: 1050
    })
  })

  it('omits fit boxes for layouts without geometry', () => {
    const empty = new THREE.Group()
    const snapshot = acexHtmlBuildSnapshotFromExportScene(
      fakeDatabase(),
      {
        layers: [{ name: '0', color: 0xffffff, visible: true }],
        layouts: [
          {
            btrId: 'ms',
            isModelSpace: true,
            layers: [{ name: '0', root: empty }]
          }
        ],
        activeLayoutBtrId: 'ms',
        modelSpaceBtrId: 'ms'
      },
      { viewerMode: 'view' }
    )

    expect(snapshot.layouts[0]?.fitExtents).toBeUndefined()
    expect(snapshot.meta.fitExtents).toBeUndefined()
  })

  it('collects batches without mutating the source layout', () => {
    const root = new THREE.Group()
    root.add(lineObject(0, 0, 10, 10))
    const collected = acexHtmlCollectBatchesFromObject3D(root)
    expect(collected.lineBatches.length).toBeGreaterThan(0)
    expect(root.children.length).toBe(1)
  })
})
