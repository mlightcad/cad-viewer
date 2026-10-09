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
    getSceneDrawableUserData,
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
    getSceneDrawableUserData,
    isBatchGeometryActive,
    isBatchGeometryVisible,
    isHighlightCloneDrawable,
    isHighlightOverlayDescendant,
    isObjectHierarchyVisible
  }
})

import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrBatchedGroup } from '../../three-renderer/src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../../three-renderer/src/batch/AcTrBatchedLine'
import { AcTrBatchedLine2 } from '../../three-renderer/src/batch/AcTrBatchedLine2'
import { RTE_REBASE_THRESHOLD } from '../../three-renderer/src/draw/AcTrBatchDrawPolicy'
import { AcTrEntity } from '../../three-renderer/src/object/AcTrEntity'
import { AcTrGroup } from '../../three-renderer/src/object/AcTrGroup'
import { AcTrLine } from '../../three-renderer/src/object/AcTrLine'
import { AcTrRenderContext } from '../../three-renderer/src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../../three-renderer/src/util'
import {
  getHighlightUserData,
  getSceneDrawableUserData
} from '../../three-renderer/src/util/AcTrObjectUserData'
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

  it('exports hatch-tier drawOrder as mesh renderOrder when object.renderOrder is 0', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0]),
        3
      )
    )
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array([0, 1, 2]), 1))
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    material.userData.drawOrder = -1
    const mesh = new THREE.Mesh(geometry, material)
    expect(mesh.renderOrder).toBe(0)

    const { meshBatches } = collectBatchesFromObject3D(mesh)
    expect(meshBatches).toHaveLength(1)
    expect(meshBatches[0]!.renderOrder).toBe(-1)
  })

  it('omits default linework-tier renderOrder from line batches', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 10, 0, 0]), 3)
    )
    const line = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    )

    const { lineBatches } = collectBatchesFromObject3D(line)
    expect(lineBatches).toHaveLength(1)
    expect(lineBatches[0]!.renderOrder).toBeUndefined()
  })
})

function worldPositions(
  positions: Float32Array,
  offset: [number, number, number]
): number[] {
  const world: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    world.push(
      toWcsCoord(positions[i]!, offset[0]),
      toWcsCoord(positions[i + 1]!, offset[1]),
      toWcsCoord(positions[i + 2]!, offset[2])
    )
  }
  return world
}

function sharedEntity(objectId: string, drawable: THREE.Object3D) {
  const entity = new AcTrEntity(new AcTrRenderContext())
  entity.objectId = objectId
  entity.visible = true
  entity.add(drawable)
  return entity
}

describe('collectBatchesFromObject3D shared block instances', () => {
  it('bakes every visible INSERT of a shared line', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const first = new THREE.LineSegments(geometry, material)
    first.updateMatrixWorld(true)
    getSceneDrawableUserData(first).sharesTemplateGeometry = true
    getSceneDrawableUserData(first).bboxIntersectionCheck = true

    const second = new THREE.LineSegments(geometry, material)
    second.position.set(0, 100, 0)
    second.updateMatrixWorld(true)
    getSceneDrawableUserData(second).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(sharedEntity('insert-a', first))
    group.addEntity(sharedEntity('insert-b', second))

    const { lineBatches } = collectBatchesFromObject3D(group)
    expect(lineBatches).toHaveLength(1)
    const exported = lineBatches[0]!
    expect(exported.excludeFromOsnap).toBe(true)
    expect(exported.positions.length).toBe(12)
    const world = worldPositions(exported.positions, exported.offset)
    expect(world[0]).toBeCloseTo(0)
    expect(world[1]).toBeCloseTo(0)
    expect(world[3]).toBeCloseTo(10)
    expect(world[4]).toBeCloseTo(0)
    expect(world[6]).toBeCloseTo(0)
    expect(world[7]).toBeCloseTo(100)
    expect(world[9]).toBeCloseTo(10)
    expect(world[10]).toBeCloseTo(100)

    group.setEntityVisible('insert-a', false)
    const hidden = collectBatchesFromObject3D(group).lineBatches
    expect(hidden).toHaveLength(1)
    const hiddenWorld = worldPositions(hidden[0]!.positions, hidden[0]!.offset)
    expect(hiddenWorld).toHaveLength(6)
    expect(hiddenWorld[1]).toBeCloseTo(100)
    expect(hiddenWorld[4]).toBeCloseTo(100)
  })

  it('bakes a rotated shared line into world space', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const line = new THREE.LineSegments(geometry, material)
    line.rotation.z = Math.PI / 2
    line.position.set(100, 0, 0)
    line.updateMatrixWorld(true)
    getSceneDrawableUserData(line).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(sharedEntity('insert-a', line))

    const { lineBatches } = collectBatchesFromObject3D(group)
    expect(lineBatches).toHaveLength(1)
    const world = worldPositions(
      lineBatches[0]!.positions,
      lineBatches[0]!.offset
    )
    expect(world[0]).toBeCloseTo(100)
    expect(world[1]).toBeCloseTo(0)
    expect(world[3]).toBeCloseTo(100)
    expect(world[4]).toBeCloseTo(10)
  })

  it('bakes shared meshes and points', () => {
    const triangle = new THREE.BufferGeometry()
    triangle.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    )
    triangle.setIndex([0, 1, 2])
    const mesh = new THREE.Mesh(
      triangle,
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    )
    mesh.position.set(50, 0, 0)
    mesh.updateMatrixWorld(true)
    getSceneDrawableUserData(mesh).sharesTemplateGeometry = true

    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0], 3)
    )
    const point = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({ color: 0xffffff })
    )
    point.position.set(5, 6, 0)
    point.updateMatrixWorld(true)
    getSceneDrawableUserData(point).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(sharedEntity('mesh-a', mesh))
    group.addEntity(sharedEntity('point-a', point))

    const { meshBatches } = collectBatchesFromObject3D(group)
    const fill = meshBatches.find(batch => !batch.points)
    const points = meshBatches.find(batch => batch.points)
    expect(fill).toBeDefined()
    expect(points).toBeDefined()
    const fillWorld = worldPositions(fill!.positions, fill!.offset)
    expect(fillWorld[0]).toBeCloseTo(50)
    expect(fillWorld[3]).toBeCloseTo(51)
    expect(fillWorld[7]).toBeCloseTo(1)
    const pointWorld = worldPositions(points!.positions, points!.offset)
    expect(pointWorld[0]).toBeCloseTo(5)
    expect(pointWorld[1]).toBeCloseTo(6)
  })

  it('keeps sibling INSERTs when the shared template has a non-finite vertex', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0, 10, 0, 0, Number.NaN, Number.NaN, Number.NaN, 0, 1, 0],
        3
      )
    )
    const first = new THREE.LineSegments(geometry, material)
    first.updateMatrixWorld(true)
    getSceneDrawableUserData(first).sharesTemplateGeometry = true
    const second = new THREE.LineSegments(geometry, material)
    second.position.set(0, 100, 0)
    second.updateMatrixWorld(true)
    getSceneDrawableUserData(second).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(sharedEntity('insert-a', first))
    group.addEntity(sharedEntity('insert-b', second))

    const { lineBatches } = collectBatchesFromObject3D(group)
    expect(lineBatches).toHaveLength(1)
    const world = worldPositions(
      lineBatches[0]!.positions,
      lineBatches[0]!.offset
    )
    expect(world).toHaveLength(12)
    expect(world.every(Number.isFinite)).toBe(true)
    expect(world[1]).toBeCloseTo(0)
    expect(world[4]).toBeCloseTo(0)
    expect(world[7]).toBeCloseTo(100)
    expect(world[10]).toBeCloseTo(100)
  })

  it('drops one INSERT with a non-finite matrix without hiding the others', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const first = new THREE.LineSegments(geometry, material)
    first.updateMatrixWorld(true)
    getSceneDrawableUserData(first).sharesTemplateGeometry = true
    const second = new THREE.LineSegments(geometry, material)
    second.position.set(0, 100, 0)
    second.updateMatrixWorld(true)
    getSceneDrawableUserData(second).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(sharedEntity('insert-a', first))
    group.addEntity(sharedEntity('insert-b', second))
    group.traverse(object => {
      const instanced = object as THREE.Object3D & {
        isInstancedMesh?: boolean
        instanceMatrix?: THREE.InstancedBufferAttribute
      }
      if (!instanced.isInstancedMesh || !instanced.instanceMatrix) return
      const array = instanced.instanceMatrix.array as Float32Array
      array.fill(Number.NaN, 0, 16)
    })

    const { lineBatches } = collectBatchesFromObject3D(group)
    expect(lineBatches).toHaveLength(1)
    const world = worldPositions(
      lineBatches[0]!.positions,
      lineBatches[0]!.offset
    )
    expect(world).toHaveLength(6)
    expect(world[1]).toBeCloseTo(100)
    expect(world[4]).toBeCloseTo(100)
  })

  it('exports a non-indexed shared triangle with a playback index', () => {
    const triangle = new THREE.BufferGeometry()
    triangle.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    )
    const mesh = new THREE.Mesh(
      triangle,
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    )
    mesh.position.set(50, 0, 0)
    mesh.updateMatrixWorld(true)
    getSceneDrawableUserData(mesh).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(sharedEntity('mesh-a', mesh))
    const { meshBatches } = collectBatchesFromObject3D(group)
    expect(meshBatches).toHaveLength(1)
    expect(meshBatches[0]!.indices).toEqual(new Uint32Array([0, 1, 2]))
    const world = worldPositions(
      meshBatches[0]!.positions,
      meshBatches[0]!.offset
    )
    expect(world[0]).toBeCloseTo(50)
    expect(world[3]).toBeCloseTo(51)
    expect(world[7]).toBeCloseTo(1)
  })

  it('exports geometry nested under a shared line', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const line = new THREE.LineSegments(geometry, material)
    getSceneDrawableUserData(line).sharesTemplateGeometry = true
    const triangle = new THREE.BufferGeometry()
    triangle.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    )
    triangle.setIndex([0, 1, 2])
    const mesh = new THREE.Mesh(
      triangle,
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    )
    getSceneDrawableUserData(mesh).sharesTemplateGeometry = true
    line.add(mesh)

    const group = new AcTrBatchedGroup()
    group.addEntity(sharedEntity('insert-a', line))
    const collected = collectBatchesFromObject3D(group)
    expect(collected.lineBatches).toHaveLength(1)
    expect(collected.meshBatches).toHaveLength(1)
  })

  it('exports every scaled fat-line INSERT of a shared block template', () => {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(new Float32Array([0, 0, 0, 25, 0, 0]))
    // Production LineSegmentsGeometry always carries the screen-space quad.
    // Without it, tryAddSharedDrawable bails out and the test only covers
    // the vertex-bake fallback.
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-1, 2, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0],
        3
      )
    )
    const material = new LineMaterial({ color: 0xffffff, linewidth: 1 })
    const scale = 191.727272741015
    const place = (objectId: string, x: number, y: number) => {
      const line = new LineSegments2(geometry, material)
      line.scale.set(scale, scale, scale)
      line.position.set(x, y, 0)
      line.updateMatrixWorld(true)
      getSceneDrawableUserData(line).sharesTemplateGeometry = true
      return sharedEntity(objectId, line)
    }

    const group = new AcTrBatchedGroup()
    group.addEntity(place('266146', 2480563.735070212, -2716794.9168123663))
    group.addEntity(place('265D5C', 2395832.9938094905, -2716794.9168123663))

    const { lineBatches } = collectBatchesFromObject3D(group)
    const segments: Array<{ x0: number; y0: number; x1: number; len: number }> =
      []
    for (const batch of lineBatches) {
      const positions = batch.positions
      for (let i = 0; i + 5 < positions.length; i += 6) {
        const x0 = positions[i]! + batch.offset[0]
        const y0 = positions[i + 1]! + batch.offset[1]
        const x1 = positions[i + 3]! + batch.offset[0]
        const y1 = positions[i + 4]! + batch.offset[1]
        segments.push({ x0, y0, x1, len: Math.hypot(x1 - x0, y1 - y0) })
      }
    }

    expect(segments).toHaveLength(2)
    expect(segments[0]!.len).toBeCloseTo(25 * scale, 0)
    expect(segments[1]!.len).toBeCloseTo(25 * scale, 0)
    const xs = segments.map(segment => segment.x0).sort((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(2395832.9938094905, 0)
    expect(xs[1]).toBeCloseTo(2480563.735070212, 0)
  })

  it('exports compacted block fat lines after the INSERT transform is reparented by layer', () => {
    const context = new AcTrRenderContext()
    const traits = {
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      layer: '01',
      lineWeight: 2
    }
    const lines = [0, 5, 10].map((y, index) => {
      const line = new AcTrLine(
        [
          { x: 0, y, z: 0 },
          { x: 25, y, z: 0 }
        ],
        traits,
        context,
        false
      )
      line.objectId = `line-${index}`
      line.layerName = '01'
      line.userData.layerName = '01'
      return line
    })
    const template = new AcTrGroup(lines, context)
    template.compactForInstancing()
    const cloned = template.fastDeepClone() as AcTrGroup
    const scale = 191.727272741015
    const insertX = 2480563.735070212
    const insertY = -2716794.9168123663
    const matrix = new THREE.Matrix4().makeScale(scale, scale, scale)
    matrix.setPosition(insertX, insertY, 0)
    cloned.matrix.copy(matrix)
    cloned.matrixAutoUpdate = false
    cloned.updateMatrixWorld(true)

    const entity = new AcTrEntity(context)
    entity.objectId = '266146'
    entity.visible = true
    entity.matrix.copy(cloned.matrix)
    entity.matrixAutoUpdate = false
    entity.matrixWorldNeedsUpdate = true
    for (const child of [...cloned.children]) {
      entity.add(child)
    }
    entity.updateMatrixWorld(true)

    const group = new AcTrBatchedGroup()
    group.addEntity(entity)
    const { lineBatches } = collectBatchesFromObject3D(group)
    const world: number[] = []
    for (const batch of lineBatches) {
      for (let i = 0; i < batch.positions.length; i += 3) {
        world.push(
          batch.positions[i]! + batch.offset[0],
          batch.positions[i + 1]! + batch.offset[1]
        )
      }
    }
    expect(world.length).toBeGreaterThan(0)
    const nearInsert = world.some((_, index) => {
      if (index % 2 !== 0) return false
      return (
        Math.hypot(world[index]! - insertX, world[index + 1]! - insertY) < 5
      )
    })
    expect(nearInsert).toBe(true)
  })

  it('keeps each scaled INSERT of a shared fat-line block on its own origin', () => {
    const context = new AcTrRenderContext()
    const traits = {
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      layer: '02',
      lineWeight: 2
    }
    const lines = [0, 5, 10].map((y, index) => {
      const line = new AcTrLine(
        [
          { x: 0, y, z: 0 },
          { x: 420, y, z: 0 }
        ],
        traits,
        context,
        false
      )
      line.objectId = `line-${index}`
      line.layerName = '02'
      line.userData.layerName = '02'
      return line
    })
    const template = new AcTrGroup(lines, context)
    template.compactForInstancing()
    const scale = 191.727272741015
    const places = [
      { id: '266146', x: 2480563.735070212, y: -2716794.9168123663 },
      { id: '265D5C', x: 2395832.9938094905, y: -2716794.9168123663 }
    ]
    const group = new AcTrBatchedGroup()
    for (const place of places) {
      const cloned = template.fastDeepClone() as AcTrGroup
      const matrix = new THREE.Matrix4().makeScale(scale, scale, scale)
      matrix.setPosition(place.x, place.y, 0)
      cloned.matrix.copy(matrix)
      cloned.matrixAutoUpdate = false
      cloned.updateMatrixWorld(true)

      const entity = new AcTrEntity(context)
      entity.objectId = place.id
      entity.visible = true
      entity.matrix.copy(cloned.matrix)
      entity.matrixAutoUpdate = false
      entity.matrixWorldNeedsUpdate = true
      for (const child of [...cloned.children]) {
        const geometry = (child as THREE.Mesh).geometry
        if (geometry && !geometry.getAttribute('position')) {
          geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(
              [-1, 2, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0],
              3
            )
          )
        }
        entity.add(child)
      }
      entity.updateMatrixWorld(true)
      group.addEntity(entity)
    }

    const { lineBatches } = collectBatchesFromObject3D(group)
    const xs: number[] = []
    for (const batch of lineBatches) {
      for (let i = 0; i + 5 < batch.positions.length; i += 6) {
        xs.push(batch.positions[i]! + batch.offset[0])
      }
    }
    expect(xs.length).toBeGreaterThan(0)
    expect(xs.some(x => Math.abs(x - places[0]!.x) < 5)).toBe(true)
    expect(xs.some(x => Math.abs(x - places[1]!.x) < 5)).toBe(true)
  })

  it('keeps scaled hairline block inserts on their own origins', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0, 420, 0, 0, 420, 0, 0, 420, 297, 0],
        3
      )
    )
    const scale = 191.727272741015
    const places = [
      { id: '266146', x: 2480563.735070212, y: -2716794.9168123663 },
      { id: '265D5C', x: 2395832.9938094905, y: -2716794.9168123663 },
      { id: '217A0E', x: 2734755.9, y: -2984504.65 }
    ]
    const group = new AcTrBatchedGroup()
    for (const place of places) {
      const line = new THREE.LineSegments(geometry, material)
      line.scale.set(scale, scale, scale)
      line.position.set(place.x, place.y, 0)
      line.updateMatrixWorld(true)
      getSceneDrawableUserData(line).sharesTemplateGeometry = true
      group.addEntity(sharedEntity(place.id, line))
    }

    const { lineBatches } = collectBatchesFromObject3D(group)
    const starts: number[] = []
    for (const batch of lineBatches) {
      for (let i = 0; i + 5 < batch.positions.length; i += 6) {
        const x0 = batch.positions[i]! + batch.offset[0]
        const y0 = batch.positions[i + 1]! + batch.offset[1]
        const x1 = batch.positions[i + 3]! + batch.offset[0]
        const y1 = batch.positions[i + 4]! + batch.offset[1]
        if (Math.abs(y0 - y1) < 1 && Math.abs(x1 - x0) > 1000) {
          starts.push(Math.min(x0, x1))
        }
      }
    }
    for (const place of places) {
      expect(starts.some(x => Math.abs(x - place.x) < 2)).toBe(true)
    }
  })
})
