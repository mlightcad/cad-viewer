import * as THREE from 'three'

import {
  canReleaseActiveLayoutBatches,
  copyFloat32Buffer,
  releaseLayerGroupsGeometryCpuArrays,
  releaseSnapshotBatchBuffers
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
  it('copyFloat32Buffer creates an independent array', () => {
    const source = f32([1, 2, 3])
    const copy = copyFloat32Buffer(source)
    source[0] = 99
    expect(copy[0]).toBe(1)
  })

  it('canReleaseActiveLayoutBatches requires analytic osnap catalog', () => {
    const withOsnap = makeSnapshot().layouts[0]!
    expect(canReleaseActiveLayoutBatches(withOsnap)).toBe(true)

    const withoutOsnap = makeSnapshot({
      layouts: [
        {
          btrId: 'ms',
          name: 'Model',
          isModelSpace: true,
          lineBatches: [],
          meshBatches: []
        }
      ]
    }).layouts[0]!
    expect(canReleaseActiveLayoutBatches(withoutOsnap)).toBe(false)
  })

  it('releaseSnapshotBatchBuffers clears inactive layouts always', () => {
    const snapshot = makeSnapshot()

    releaseSnapshotBatchBuffers(snapshot, 'ms')

    expect(snapshot.layouts[0]!.lineBatches).toHaveLength(0)
    expect(snapshot.layouts[1]!.lineBatches).toHaveLength(0)
  })

  it('releaseSnapshotBatchBuffers keeps active layout batches without osnap catalog', () => {
    const snapshot = makeSnapshot({
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
          meshBatches: []
        }
      ],
      activeLayoutBtrId: 'ms'
    })

    releaseSnapshotBatchBuffers(snapshot, 'ms')

    expect(snapshot.layouts[0]!.lineBatches).toHaveLength(1)
    expect(snapshot.layouts[0]!.lineBatches[0]!.positions).toHaveLength(6)
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
})
