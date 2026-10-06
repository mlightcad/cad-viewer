import { estimateLineBatchBytes, estimateMeshBatchBytes } from '../src/AcExBatchBinaryCodec'
import {
  splitLineBatch,
  splitMeshBatch
} from '../src/AcExGeometryBatchSplit'
import { splitLayoutIntoSlices } from '../src/AcExPackageBuilder'
import {
  ACEX_DEFAULT_CHUNK_MAX_BYTES,
  ACEX_MAX_GEOMETRY_BATCH_BYTES
} from '../src/AcExPackageTypes'
import type { AcExLayoutSnapshot, AcExLineBatch, AcExMeshBatch } from '../src/AcExSnapshotTypes'

function sequentialLinePositions(segmentCount: number): Float32Array {
  const positions = new Float32Array(segmentCount * 6)
  for (let i = 0; i < segmentCount; i++) {
    positions[i * 6] = i
    positions[i * 6 + 3] = i + 1
  }
  return positions
}

function lineSegmentKeys(batch: AcExLineBatch): string[] {
  const keys: string[] = []
  const pos = batch.positions
  if (batch.indices && batch.indices.length >= 2) {
    for (let i = 0; i + 1 < batch.indices.length; i += 2) {
      const a = batch.indices[i]! * 3
      const b = batch.indices[i + 1]! * 3
      keys.push(
        `${pos[a]},${pos[a + 1]},${pos[a + 2]}|${pos[b]},${pos[b + 1]},${pos[b + 2]}`
      )
    }
    return keys
  }
  for (let i = 0; i + 5 < pos.length; i += 6) {
    keys.push(
      `${pos[i]},${pos[i + 1]},${pos[i + 2]}|${pos[i + 3]},${pos[i + 4]},${pos[i + 5]}`
    )
  }
  return keys
}

function triangleKeys(batch: AcExMeshBatch): string[] {
  const keys: string[] = []
  const pos = batch.positions
  const idx = batch.indices!
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const verts = [idx[i]!, idx[i + 1]!, idx[i + 2]!].map(vi => {
      const o = vi * 3
      return `${pos[o]},${pos[o + 1]},${pos[o + 2]}`
    })
    keys.push(verts.join('|'))
  }
  return keys
}

describe('AcExGeometryBatchSplit', () => {
  it('exports a tunable max batch size constant', () => {
    expect(ACEX_MAX_GEOMETRY_BATCH_BYTES).toBe(2 * 1024 * 1024)
    expect(ACEX_MAX_GEOMETRY_BATCH_BYTES).toBe(ACEX_DEFAULT_CHUNK_MAX_BYTES)
  })

  it('leaves small line batches intact', () => {
    const batch: AcExLineBatch = {
      layer: '0',
      color: 0xff0000,
      offset: [1, 2, 3],
      positions: sequentialLinePositions(2)
    }
    expect(splitLineBatch(batch, ACEX_MAX_GEOMETRY_BATCH_BYTES)).toEqual([batch])
  })

  it('splits a large sequential line batch and keeps every segment', () => {
    const batch: AcExLineBatch = {
      layer: 'WALL',
      color: 0x00ff00,
      offset: [10, 20, 0],
      positions: sequentialLinePositions(400),
      lineWidth: 2,
      renderOrder: -1,
      excludeFromOsnap: true,
      lineDistances: Float32Array.from({ length: 800 }, (_, i) => i)
    }
    const pieces = splitLineBatch(batch, 2000)
    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces.every(piece => estimateLineBatchBytes(piece) <= 2000 + 24)).toBe(
      true
    )
    expect(pieces.flatMap(lineSegmentKeys).sort()).toEqual(
      lineSegmentKeys(batch).sort()
    )
    expect(pieces.every(piece => piece.layer === 'WALL')).toBe(true)
    expect(pieces.every(piece => piece.lineWidth === 2)).toBe(true)
    expect(pieces.every(piece => piece.excludeFromOsnap === true)).toBe(true)
    expect(
      pieces.reduce((n, piece) => n + (piece.lineDistances?.length ?? 0), 0)
    ).toBe(800)
  })

  it('splits an indexed line batch without dropping segments', () => {
    const positions = sequentialLinePositions(80)
    const indices = new Uint32Array(80 * 2)
    for (let i = 0; i < 80; i++) {
      indices[i * 2] = i * 2
      indices[i * 2 + 1] = i * 2 + 1
    }
    const batch: AcExLineBatch = {
      layer: '0',
      color: 1,
      offset: [0, 0, 0],
      positions,
      indices,
      lineDistances: Float32Array.from({ length: 160 }, (_, i) => i * 0.5)
    }
    const pieces = splitLineBatch(batch, 1500)
    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces.flatMap(lineSegmentKeys).sort()).toEqual(
      lineSegmentKeys(batch).sort()
    )
    expect(pieces.every(piece => piece.indices && piece.indices.length >= 2)).toBe(
      true
    )
  })

  it('splits an indexed mesh and preserves every triangle', () => {
    const positions = new Float32Array(21)
    for (let i = 0; i < 7; i++) {
      positions[i * 3] = i
      positions[i * 3 + 1] = i * 2
    }
    const indices = new Uint32Array(90)
    for (let t = 0; t < 30; t++) {
      indices[t * 3] = t % 7
      indices[t * 3 + 1] = (t + 1) % 7
      indices[t * 3 + 2] = (t + 2) % 7
    }
    const batch: AcExMeshBatch = {
      layer: 'HATCH',
      color: 0x0000ff,
      offset: [0, 0, 0],
      positions,
      indices,
      hatchPattern: {
        patternAngle: 0,
        patternLines: []
      },
      renderOrder: -1
    }
    const pieces = splitMeshBatch(batch, 500)
    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces.flatMap(triangleKeys).sort()).toEqual(triangleKeys(batch).sort())
    expect(pieces.every(piece => piece.hatchPattern?.patternAngle === 0)).toBe(
      true
    )
    expect(pieces.every(piece => piece.renderOrder === -1)).toBe(true)
  })

  it('does not split textured IMAGE/OLE mesh batches', () => {
    const batch: AcExMeshBatch = {
      layer: '0',
      color: 0xffffff,
      offset: [0, 0, 0],
      positions: new Float32Array(3000),
      indices: Uint32Array.from({ length: 3000 }, (_, i) => i),
      uvs: new Float32Array(2000),
      texture: { mimeType: 'image/png', bytes: new Uint8Array(80_000) }
    }
    expect(estimateMeshBatchBytes(batch)).toBeGreaterThan(2000)
    expect(splitMeshBatch(batch, 2000)).toEqual([batch])
  })

  it('turns one oversized layer batch into multiple layout slices', () => {
    const layout: AcExLayoutSnapshot = {
      btrId: 'ms',
      name: '*Model_Space',
      isModelSpace: true,
      lineBatches: [
        {
          layer: '0',
          color: 0xff0000,
          offset: [0, 0, 0],
          positions: sequentialLinePositions(400)
        }
      ],
      meshBatches: []
    }
    const slices = splitLayoutIntoSlices(layout, 2000, 2000)
    expect(slices.length).toBeGreaterThan(1)
    const totalSegments = slices.reduce(
      (n, slice) =>
        n +
        slice.lineBatches.reduce(
          (m, batch) => m + ((batch.positions.length / 6) | 0),
          0
        ),
      0
    )
    expect(totalSegments).toBe(400)
    expect(slices.every(slice => slice.estimatedBytes <= 2000 + 256)).toBe(true)
  })
})
