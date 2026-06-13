import { decodeSnapshot, encodeSnapshot } from '../src/AcExSnapshotCodec'
import { ACEX_SNAPSHOT_VERSION } from '../src/AcExSnapshotTypes'

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

describe('AcExSnapshotCodec', () => {
  it('round-trips a minimal snapshot', () => {
    const snapshot = {
      version: ACEX_SNAPSHOT_VERSION,
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        extents: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        units: {
          insunits: 4,
          lunits: 2,
          luprec: 4,
          aunits: 0,
          auprec: 0,
          measurement: 1,
          ltscale: 1,
          angbase: 0,
          angdir: 0
        },
        background: 0
      },
      layers: [{ name: '0', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [],
          meshBatches: []
        }
      ],
      activeLayoutBtrId: 'ms'
    }
    const encoded = encodeSnapshot(snapshot)
    const decoded = decodeSnapshot(encoded)
    expect(decoded.meta.extents.maxX).toBe(10)
    expect(decoded.layers[0]?.name).toBe('0')
  })

  it('round-trips binary geometry buffers', () => {
    const snapshot = {
      version: ACEX_SNAPSHOT_VERSION,
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        extents: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        units: {
          insunits: 4,
          lunits: 2,
          luprec: 4,
          aunits: 0,
          auprec: 0,
          measurement: 1,
          ltscale: 1,
          angbase: 0,
          angdir: 0
        },
        background: 0
      },
      layers: [{ name: '0', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [
            {
              layer: '0',
              color: 0xff0000,
              offset: [1, 2, 0] as [number, number, number],
              positions: f32([0, 0, 0, 10, 0, 0]),
              indices: Uint32Array.from([0, 1]),
              lineDistances: f32([0, 10])
            }
          ],
          meshBatches: [
            {
              layer: '0',
              color: 0x00ff00,
              offset: [0, 0, 0] as [number, number, number],
              positions: f32([0, 0, 0, 1, 0, 0, 0, 1, 0]),
              indices: Uint32Array.from([0, 1, 2]),
              gradientPositions: f32([0, 0, 1, 0, 0, 1])
            }
          ]
        }
      ],
      activeLayoutBtrId: 'ms'
    }

    const decoded = decodeSnapshot(encodeSnapshot(snapshot))
    const line = decoded.layouts[0]!.lineBatches[0]!
    expect(Array.from(line.positions)).toEqual([0, 0, 0, 10, 0, 0])
    expect(Array.from(line.indices!)).toEqual([0, 1])
    expect(Array.from(line.lineDistances!)).toEqual([0, 10])

    const mesh = decoded.layouts[0]!.meshBatches[0]!
    expect(Array.from(mesh.positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0])
    expect(Array.from(mesh.indices!)).toEqual([0, 1, 2])
    expect(Array.from(mesh.gradientPositions!)).toEqual([0, 0, 1, 0, 0, 1])
  })

  it('preserves large rebase origins as float64', () => {
    const largeOrigin = 1_234_567_890.125
    const snapshot = {
      version: ACEX_SNAPSHOT_VERSION,
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        extents: {
          minX: largeOrigin,
          minY: largeOrigin,
          maxX: largeOrigin + 10,
          maxY: largeOrigin + 10
        },
        units: {
          insunits: 4,
          lunits: 2,
          luprec: 4,
          aunits: 0,
          auprec: 0,
          measurement: 1,
          ltscale: 1,
          angbase: 0,
          angdir: 0
        },
        background: 0
      },
      layers: [{ name: '0', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [
            {
              layer: '0',
              color: 0xff0000,
              offset: [largeOrigin, largeOrigin + 100, 0] as [
                number,
                number,
                number
              ],
              positions: f32([0.5, 1.25, 0, 10.5, 2.75, 0])
            }
          ],
          meshBatches: []
        }
      ],
      activeLayoutBtrId: 'ms'
    }

    const line = decodeSnapshot(encodeSnapshot(snapshot)).layouts[0]!
      .lineBatches[0]!
    expect(line.offset[0]).toBe(largeOrigin)
    expect(line.offset[1]).toBe(largeOrigin + 100)
    expect(Array.from(line.positions)).toEqual([0.5, 1.25, 0, 10.5, 2.75, 0])
  })

  it('round-trips wide-line lineWidth through binary codec', () => {
    const snapshot = {
      version: ACEX_SNAPSHOT_VERSION,
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        extents: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        units: {
          insunits: 4,
          lunits: 2,
          luprec: 4,
          aunits: 0,
          auprec: 0,
          measurement: 1,
          ltscale: 1,
          angbase: 0,
          angdir: 0
        },
        background: 0
      },
      layers: [{ name: '0', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [
            {
              layer: '0',
              color: 0x00ff00,
              offset: [100_000, 2_000_000, 0] as [number, number, number],
              positions: f32([0, 0, 0, 100, 50, 0]),
              lineWidth: 2.5
            }
          ],
          meshBatches: []
        }
      ],
      activeLayoutBtrId: 'ms'
    }

    const line = decodeSnapshot(encodeSnapshot(snapshot)).layouts[0]!
      .lineBatches[0]!
    expect(line.lineWidth).toBe(2.5)
    expect(line.color).toBe(0x00ff00)
    expect(Array.from(line.positions)).toEqual([0, 0, 0, 100, 50, 0])
    expect(line.offset).toEqual([100_000, 2_000_000, 0])
  })
})
