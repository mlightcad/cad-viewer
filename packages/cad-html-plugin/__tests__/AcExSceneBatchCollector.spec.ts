jest.mock('@mlightcad/three-renderer', () => {
  const { AcTrBatchedLine } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedLine'
  )
  const { AcTrBatchedLine2 } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedLine2'
  )
  const { AcTrBatchedMesh } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedMesh'
  )
  const { AcTrBatchedPoint } = jest.requireActual(
    '../../three-renderer/src/batch/AcTrBatchedPoint'
  )
  const {
    getMaterialMetadata,
    isBatchGeometryActive,
    isBatchGeometryVisible,
    isHighlightCloneDrawable,
    isHighlightOverlayDescendant,
    isObjectHierarchyVisible
  } = jest.requireActual('../../three-renderer/src')

  return {
    AcTrBatchedLine,
    AcTrBatchedLine2,
    AcTrBatchedMesh,
    AcTrBatchedPoint,
    getMaterialMetadata,
    isBatchGeometryActive,
    isBatchGeometryVisible,
    isHighlightCloneDrawable,
    isHighlightOverlayDescendant,
    isObjectHierarchyVisible
  }
})

import { AcTrBatchedGroup } from '../../three-renderer/src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../../three-renderer/src/batch/AcTrBatchedLine'
import { AcTrBatchedLine2 } from '../../three-renderer/src/batch/AcTrBatchedLine2'
import { RTE_REBASE_THRESHOLD } from '../../three-renderer/src/draw/AcTrBatchDrawPolicy'
import { AcTrEntity } from '../../three-renderer/src/object/AcTrEntity'
import { AcTrRenderContext } from '../../three-renderer/src/renderer/AcTrRenderContext'
import { getSceneDrawableUserData } from '../../three-renderer/src/util/AcTrObjectUserData'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import {
  compactIndexedSlice,
  readBatchWorldOffset,
  toWcsCoord
} from '../src/AcExBatchBuffers'
import {
  collectBatchesFromObject3D,
  exportActiveBatchedLine2Slice,
  exportActiveBatchedSlice,
  exportBufferGeometrySlice
} from '../src/AcExSceneBatchCollector'
import { getHighlightUserData } from '../../three-renderer/src/util/AcTrObjectUserData'

const BATCH_SLOT_ACTIVE = 0b11
const BATCH_SLOT_HIDDEN = 0b01
const BATCH_SLOT_INACTIVE = 0

function createWideLineSegmentGeometry(
  start: [number, number, number],
  end: [number, number, number]
): LineSegmentsGeometry {
  const geometry = new LineSegmentsGeometry()
  geometry.setPositions(
    new Float32Array([start[0], start[1], start[2], end[0], end[1], end[2]])
  )
  return geometry
}

function createMockBatch(
  slots: Array<{
    flags: number
    vertexStart: number
    vertexCount: number
    indexStart: number
    indexCount: number
  }>
) {
  return {
    mappingStats: { count: slots.length },
    getGeometryRangeAt(geometryId: number) {
      const info = slots[geometryId]
      if (!info || (info.flags & 1) === 0) {
        throw new Error('inactive')
      }
      return info
    }
  }
}

describe('exportBufferGeometrySlice', () => {
  it('exports non-indexed geometry when drawRange.count is Infinity', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0]), 3)
    )
    geometry.setDrawRange(0, Infinity)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 1, 0, 0])
    expect(slice.indices).toBeUndefined()
  })

  it('exports indexed geometry when drawRange.count is Infinity', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]),
        3
      )
    )
    geometry.setIndex([0, 1, 2])
    geometry.setDrawRange(0, Infinity)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 1, 0, 0, 2, 0, 0])
    expect(Array.from(slice.indices!)).toEqual([0, 1, 2])
  })

  it('honors a finite draw range on non-indexed geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]),
        3
      )
    )
    geometry.setDrawRange(1, 2)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([1, 0, 0, 2, 0, 0])
  })

  it('trims unused position tail for indexed geometry exports', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0, 0, 0, 10, 0, 0, 0, 10, 0, 999, 999, 999, 999, 999, 999
        ]),
        3
      )
    )
    geometry.setIndex([0, 1, 2])
    geometry.setDrawRange(0, 3)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 10, 0, 0, 0, 10, 0])
    expect(Array.from(slice.indices!)).toEqual([0, 1, 2])
  })
})

describe('exportActiveBatchedSlice', () => {
  it('exports only active indexCount for indexed batched geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 99, 99, 99]),
        3
      )
    )
    geometry.setIndex([0, 1, 2, 0, 0, 0])
    geometry.setDrawRange(0, 6)

    const slice = exportActiveBatchedSlice(
      createMockBatch([
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 3,
          indexStart: 0,
          indexCount: 3
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 10, 0, 0, 0, 10, 0])
    expect(Array.from(slice.indices!)).toEqual([0, 1, 2])
  })

  it('skips inactive slots and reserved vertices for non-indexed geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 6, 6, 6, 0, 0, 0, 0, 0, 0
        ]),
        3
      )
    )
    geometry.setDrawRange(0, 8)

    const slice = exportActiveBatchedSlice(
      createMockBatch([
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          flags: BATCH_SLOT_INACTIVE,
          vertexStart: 4,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 4,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([
      0, 0, 0, 1, 0, 0, 5, 5, 5, 6, 6, 6
    ])
  })

  it('skips active but hidden slots during export', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 9, 9, 9, 8, 8, 8]),
        3
      )
    )

    const slice = exportActiveBatchedSlice(
      createMockBatch([
        {
          flags: BATCH_SLOT_HIDDEN,
          vertexStart: 2,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 1, 0, 0])
  })
})

describe('exportActiveBatchedLine2Slice', () => {
  it('exports active wide-line segments as start/end position pairs', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'instanceStart',
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 10, 0, 99, 99, 99], 3)
    )
    geometry.setAttribute(
      'instanceEnd',
      new THREE.Float32BufferAttribute([10, 0, 0, 10, 10, 0, 99, 99, 99], 3)
    )

    const slice = exportActiveBatchedLine2Slice(
      createMockBatch([
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([
      0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0
    ])
  })

  it('reads interleaved LineSegmentsGeometry buffers by segment index', () => {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(
      new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0])
    )

    const slice = exportActiveBatchedLine2Slice(
      createMockBatch([
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([
      0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0
    ])
  })
})

describe('compactIndexedSlice', () => {
  it('keeps positions referenced by the index buffer', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 99, 99, 99])
    const indices = new Uint32Array([0, 1, 2])

    const compact = compactIndexedSlice(positions, indices)

    expect(Array.from(compact.positions)).toEqual([0, 0, 0, 1, 0, 0, 2, 0, 0])
    expect(Array.from(compact.indices)).toEqual([0, 1, 2])
  })
})

function createRebasedLineSegments(
  wcsStart: [number, number, number],
  wcsEnd: [number, number, number]
): THREE.LineSegments {
  const cx = (wcsStart[0] + wcsEnd[0]) / 2
  const cy = (wcsStart[1] + wcsEnd[1]) / 2
  const cz = ((wcsStart[2] ?? 0) + (wcsEnd[2] ?? 0)) / 2
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        wcsStart[0] - cx,
        wcsStart[1] - cy,
        (wcsStart[2] ?? 0) - cz,
        wcsEnd[0] - cx,
        wcsEnd[1] - cy,
        (wcsEnd[2] ?? 0) - cz
      ]),
      3
    )
  )
  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
  line.position.set(cx, cy, cz)
  return line
}

describe('collectBatchesFromObject3D rebase offsets', () => {
  it('exports batched line geometry with the batch origin offset', () => {
    const worldOffset = new THREE.Vector3(1_000_000, 2_000_000, 0)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 100, 50, 0], 3)
    )
    geometry.setIndex([0, 1])

    const batch = new AcTrBatchedLine()
    const geometryId = batch.addGeometry(geometry, -1, -1, worldOffset)
    batch.setGeometryInfo(geometryId, { objectId: 'line-1' })

    const root = new THREE.Group()
    root.add(batch)
    root.updateMatrixWorld(true)

    const { lineBatches } = collectBatchesFromObject3D(root)
    expect(lineBatches).toHaveLength(1)

    const exported = lineBatches[0]!
    // Batch origin is the first geometry bbox center plus worldOffset.
    expect(exported.offset[0]).toBeCloseTo(1_000_050, 3)
    expect(exported.offset[1]).toBeCloseTo(2_000_025, 3)
    expect(toWcsCoord(exported.positions[0]!, exported.offset[0]!)).toBeCloseTo(
      1_000_000,
      3
    )
    expect(toWcsCoord(exported.positions[1]!, exported.offset[1]!)).toBeCloseTo(
      2_000_000,
      3
    )
    expect(toWcsCoord(exported.positions[3]!, exported.offset[0]!)).toBeCloseTo(
      1_000_100,
      3
    )
    expect(toWcsCoord(exported.positions[4]!, exported.offset[1]!)).toBeCloseTo(
      2_000_050,
      3
    )
  })

  it('uses matrixWorld translation for rebased lines nested under a parent', () => {
    const line = createRebasedLineSegments(
      [100_010, 200_020, 0],
      [100_110, 200_070, 0]
    )
    const parent = new THREE.Group()
    parent.position.set(900_000, 1_800_000, 0)
    parent.add(line)
    parent.updateMatrixWorld(true)

    const { lineBatches } = collectBatchesFromObject3D(parent)
    expect(lineBatches).toHaveLength(1)

    const exported = lineBatches[0]!
    expect(exported.offset[0]).toBeCloseTo(1_000_060, 3)
    expect(exported.offset[1]).toBeCloseTo(2_000_045, 3)
    expect(toWcsCoord(exported.positions[0]!, exported.offset[0]!)).toBeCloseTo(
      1_000_010,
      3
    )
    expect(toWcsCoord(exported.positions[1]!, exported.offset[1]!)).toBeCloseTo(
      2_000_020,
      3
    )
    expect(toWcsCoord(exported.positions[3]!, exported.offset[0]!)).toBeCloseTo(
      1_000_110,
      3
    )
    expect(toWcsCoord(exported.positions[4]!, exported.offset[1]!)).toBeCloseTo(
      2_000_070,
      3
    )
  })

  it('reads world offset from matrixWorld for nested drawables', () => {
    const line = createRebasedLineSegments([10, 20, 0], [110, 70, 0])
    const parent = new THREE.Group()
    parent.position.set(900_000, 1_800_000, 0)
    parent.add(line)
    parent.updateMatrixWorld(true)

    expect(readBatchWorldOffset(line)).toEqual([900_060, 1_800_045, 0])
  })

  it('exports multiple origin-split batched lines with reconstructable WCS', () => {
    const group = new AcTrBatchedGroup()
    const material = new THREE.LineBasicMaterial()
    const farX = 100_000 + RTE_REBASE_THRESHOLD + 100

    const createPositionedLine = (x: number, y: number) => {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, 0, 0, 100, 50, 0], 3)
      )
      geometry.setIndex([0, 1])
      const line = new THREE.LineSegments(geometry, material)
      line.position.set(x, y, 0)
      line.updateMatrixWorld(true)
      return line
    }

    const createEntity = (objectId: string, ...drawables: THREE.Object3D[]) => {
      const entity = new AcTrEntity(new AcTrRenderContext())
      entity.objectId = objectId
      entity.visible = true
      for (const drawable of drawables) {
        entity.add(drawable)
      }
      return entity
    }

    group.addEntity(
      createEntity('line-near-a', createPositionedLine(100_000, 2_000_000))
    )
    group.addEntity(
      createEntity('line-near-b', createPositionedLine(100_500, 2_000_050))
    )
    group.addEntity(
      createEntity('line-far', createPositionedLine(farX, 3_000_000))
    )

    expect(
      group.children.filter(child => child instanceof AcTrBatchedLine)
    ).toHaveLength(2)

    const { lineBatches } = collectBatchesFromObject3D(group)
    expect(lineBatches).toHaveLength(2)

    lineBatches.sort((a, b) => a.offset[0] - b.offset[0])
    const nearExport = lineBatches[0]!
    const farExport = lineBatches[1]!

    expect(
      toWcsCoord(nearExport.positions[0]!, nearExport.offset[0]!)
    ).toBeCloseTo(100_000, 0)
    expect(
      toWcsCoord(nearExport.positions[1]!, nearExport.offset[1]!)
    ).toBeCloseTo(2_000_000, 0)
    expect(
      toWcsCoord(nearExport.positions[3]!, nearExport.offset[0]!)
    ).toBeCloseTo(100_100, 0)
    expect(
      toWcsCoord(nearExport.positions[4]!, nearExport.offset[1]!)
    ).toBeCloseTo(2_000_050, 0)

    expect(
      toWcsCoord(farExport.positions[0]!, farExport.offset[0]!)
    ).toBeCloseTo(farX, 0)
    expect(
      toWcsCoord(farExport.positions[1]!, farExport.offset[1]!)
    ).toBeCloseTo(3_000_000, 0)

    for (const batch of lineBatches) {
      for (let i = 0; i < batch.positions.length; i++) {
        expect(Math.abs(batch.positions[i]!)).toBeLessThan(RTE_REBASE_THRESHOLD)
      }
    }
  })

  it('exports batched wide lines from AcTrBatchedLine2 with line width', () => {
    const material = new LineMaterial({ color: 0x00ff00, linewidth: 2.5 })
    const batch = new AcTrBatchedLine2(16, material)
    const worldOffset = new THREE.Vector3(100_000, 2_000_000, 0)
    const segmentGeometry = createWideLineSegmentGeometry(
      [0, 0, 0],
      [100, 50, 0]
    )
    const geometryId = batch.addGeometry(segmentGeometry, -1, worldOffset)
    batch.setGeometryInfo(geometryId, { objectId: 'wide-line' })

    const root = new THREE.Group()
    root.add(batch)
    root.updateMatrixWorld(true)

    const { lineBatches } = collectBatchesFromObject3D(root)
    expect(lineBatches).toHaveLength(1)

    const exported = lineBatches[0]!
    expect(exported.lineWidth).toBe(2.5)
    expect(exported.color).toBe(0x00ff00)
    expect(toWcsCoord(exported.positions[0]!, exported.offset[0]!)).toBeCloseTo(
      100_000,
      0
    )
    expect(toWcsCoord(exported.positions[1]!, exported.offset[1]!)).toBeCloseTo(
      2_000_000,
      0
    )
    expect(toWcsCoord(exported.positions[3]!, exported.offset[0]!)).toBeCloseTo(
      100_100,
      0
    )
    expect(toWcsCoord(exported.positions[4]!, exported.offset[1]!)).toBeCloseTo(
      2_000_050,
      0
    )
  })

  it('exports unbatched LineSegments2 drawables with line width', () => {
    const geometry = createWideLineSegmentGeometry([0, 0, 0], [100, 50, 0])
    const material = new LineMaterial({ color: 0xff0000, linewidth: 2.5 })
    const line = new LineSegments2(geometry, material)
    line.position.set(100_000, 2_000_000, 0)
    line.updateMatrixWorld(true)

    const { lineBatches } = collectBatchesFromObject3D(line)
    expect(lineBatches).toHaveLength(1)
    expect(lineBatches[0]!.lineWidth).toBe(2.5)
    expect(lineBatches[0]!.color).toBe(0xff0000)
  })

  it('skips selection and hover highlight overlays during export', () => {
    const group = new AcTrBatchedGroup()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const line = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    )
    line.position.set(100, 200, 0)
    getSceneDrawableUserData(line).noBatch = true

    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.objectId = 'line-1'
    entity.visible = true
    entity.add(line)
    group.addEntity(entity)
    group.select('line-1')

    const { lineBatches } = collectBatchesFromObject3D(group)
    expect(lineBatches).toHaveLength(1)
    expect(lineBatches[0]!.color).toBe(0xffffff)
  })

  it('skips highlight clone drawables even without overlay group markers', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const source = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    )
    source.position.set(100, 200, 0)

    const highlightClone = source.clone() as THREE.LineSegments
    getHighlightUserData(highlightClone).objectId = 'line-1'

    const root = new THREE.Group()
    root.add(source)
    root.add(highlightClone)

    const { lineBatches } = collectBatchesFromObject3D(root)
    expect(lineBatches).toHaveLength(1)
    expect(lineBatches[0]!.color).toBe(0xffffff)
  })

  it('skips scene-hidden unbatched drawables during export', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const visible = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    )
    const hidden = visible.clone() as THREE.LineSegments
    hidden.visible = false

    const root = new THREE.Group()
    root.add(visible)
    root.add(hidden)

    const { lineBatches } = collectBatchesFromObject3D(root)
    expect(lineBatches).toHaveLength(1)
  })

  it('skips drawables hidden by an invisible ancestor during export', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const line = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    )
    const hiddenGroup = new THREE.Group()
    hiddenGroup.visible = false
    hiddenGroup.add(line)

    const visible = new THREE.LineSegments(
      geometry.clone(),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    )

    const root = new THREE.Group()
    root.add(hiddenGroup)
    root.add(visible)

    const { lineBatches } = collectBatchesFromObject3D(root)
    expect(lineBatches).toHaveLength(1)
  })

  it('exports only active LineSegments2 instanceCount segments', () => {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(
      new Float32Array([
        0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0, 99, 99, 99, 88, 88, 88
      ])
    )
    ;(geometry as THREE.InstancedBufferGeometry).instanceCount = 2

    const material = new LineMaterial({ color: 0xff0000, linewidth: 2.5 })
    const line = new LineSegments2(geometry, material)

    const { lineBatches } = collectBatchesFromObject3D(line)
    expect(lineBatches).toHaveLength(1)
    expect(lineBatches[0]!.positions.length).toBe(12)
  })
})
