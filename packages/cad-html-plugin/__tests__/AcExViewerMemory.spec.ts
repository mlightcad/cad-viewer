import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import {
  releaseLayerGroupsGeometryCpuArrays,
  releaseSnapshotBatchBuffers,
  releaseSnapshotOsnapCatalogs
} from '../src/AcExViewerMemory'
import { ACEX_SNAPSHOT_VERSION } from '../src/AcExSnapshotTypes'

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta: {
      createdAt: '',
      extents: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      units: {
        insunits: 0,
        lunits: 2,
        luprec: 2,
        aunits: 0,
        auprec: 0,
        measurement: 1,
        ltscale: 1,
        angbase: 0,
        angdir: 0
      },
      background: 0
    },
    layers: [],
    layouts: [
      {
        btrId: 'ms',
        name: 'Model',
        isModelSpace: true,
        lineBatches: [
          {
            layer: '0',
            color: 0xffffff,
            offset: [0, 0, 0] as [number, number, number],
            positions: f32([0, 0, 0, 1, 0, 0])
          }
        ],
        meshBatches: [],
        osnap: {
          primitives: [
            {
              kind: 'line' as const,
              layer: '0',
              x0: 0,
              y0: 0,
              x1: 1,
              y1: 0
            }
          ]
        }
      },
      {
        btrId: 'ps',
        name: 'Layout1',
        isModelSpace: false,
        lineBatches: [
          {
            layer: '0',
            color: 0xffffff,
            offset: [0, 0, 0] as [number, number, number],
            positions: f32([2, 0, 0, 3, 0, 0])
          }
        ],
        meshBatches: []
      }
    ],
    activeLayoutBtrId: 'ms',
    ...overrides
  }
}

describe('AcExViewerMemory', () => {
  it('releaseSnapshotBatchBuffers clears every layout', () => {
    const snapshot = makeSnapshot()

    releaseSnapshotBatchBuffers(snapshot)

    expect(snapshot.layouts[0]!.lineBatches).toHaveLength(0)
    expect(snapshot.layouts[1]!.lineBatches).toHaveLength(0)
  })

  it('releaseSnapshotOsnapCatalogs clears layout catalogs without dropping retained primitives', () => {
    const snapshot = makeSnapshot()
    const activeLayout = snapshot.layouts[0]!
    const retained = activeLayout.osnap!.primitives

    releaseSnapshotOsnapCatalogs(snapshot)

    expect(activeLayout.osnap).toBeUndefined()
    expect(snapshot.layouts[1]!.osnap).toBeUndefined()
    expect(retained).toHaveLength(1)
    expect(retained[0]).toMatchObject({
      kind: 'line',
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 0
    })
  })

  it('releaseLayerGroupsGeometryCpuArrays empties geometry attribute arrays', () => {
    const group = new THREE.Group()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(f32([0, 0, 0, 1, 0, 0]), 3)
    )
    group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial()))

    releaseLayerGroupsGeometryCpuArrays(new Map([['0', group]]))

    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    expect(position.array).toHaveLength(0)
  })

  it('releaseLayerGroupsGeometryCpuArrays empties LineSegments2 geometry buffers', () => {
    const group = new THREE.Group()
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(f32([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]))
    const material = new LineMaterial({ linewidth: 2, color: 0xffffff })
    group.add(new LineSegments2(geometry, material))

    releaseLayerGroupsGeometryCpuArrays(new Map([['0', group]]))

    const instanceStart = geometry.getAttribute(
      'instanceStart'
    ) as THREE.InterleavedBufferAttribute
    const instanceEnd = geometry.getAttribute(
      'instanceEnd'
    ) as THREE.InterleavedBufferAttribute
    expect(instanceStart.count).toBe(2)
    expect(instanceEnd.count).toBe(2)
    expect(instanceStart.data.array).toHaveLength(0)
  })
})
