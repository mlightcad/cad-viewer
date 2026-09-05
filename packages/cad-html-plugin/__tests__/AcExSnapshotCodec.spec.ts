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
    expect(encoded.compression).toBe('gzip')
    const decoded = decodeSnapshot(encoded.payload)
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

    const encoded = encodeSnapshot(snapshot)
    const decoded = decodeSnapshot(encoded.payload)
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

    const encoded = encodeSnapshot(snapshot)
    const line = decodeSnapshot(encoded.payload).layouts[0]!.lineBatches[0]!
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

    const encoded = encodeSnapshot(snapshot)
    const line = decodeSnapshot(encoded.payload).layouts[0]!.lineBatches[0]!
    expect(line.lineWidth).toBe(2.5)
    expect(line.color).toBe(0x00ff00)
    expect(Array.from(line.positions)).toEqual([0, 0, 0, 100, 50, 0])
    expect(line.offset).toEqual([100_000, 2_000_000, 0])
  })

  it('round-trips paper-space viewport descriptors', () => {
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
          btrId: 'ps',
          name: 'Layout1',
          isModelSpace: false,
          lineBatches: [],
          meshBatches: [],
          viewports: [
            {
              paper: { minX: 0, minY: 0, maxX: 12, maxY: 9 },
              model: { minX: 100, minY: 200, maxX: 400, maxY: 500 },
              twist: Math.PI / 4
            }
          ]
        }
      ],
      activeLayoutBtrId: 'ps'
    }

    const decoded = decodeSnapshot(encodeSnapshot(snapshot).payload)
    expect(decoded.layouts[0]!.viewports?.[0]?.paper).toEqual({
      minX: 0,
      minY: 0,
      maxX: 12,
      maxY: 9
    })
    expect(decoded.layouts[0]!.viewports?.[0]?.model).toEqual({
      minX: 100,
      minY: 200,
      maxX: 400,
      maxY: 500
    })
    expect(decoded.layouts[0]!.viewports?.[0]?.twist).toBeCloseTo(Math.PI / 4)
  })

  it('self-contained HTML payloads shrink when osnap omits duplicated line primitives', () => {
    const meta = {
      createdAt: '2026-01-01T00:00:00.000Z',
      extents: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
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
    }
    const lineBatch = {
      layer: '0',
      color: 0xff0000,
      offset: [0, 0, 0] as [number, number, number],
      positions: f32([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]),
      indices: Uint32Array.from([0, 1, 1, 2, 2, 3, 3, 0])
    }
    const linePrimitives = Array.from({ length: 2000 }, (_, i) => ({
      kind: 'line' as const,
      layer: '0',
      x0: i,
      y0: 0,
      x1: i + 1,
      y1: 1
    }))
    const withDuplicatedLines = {
      version: ACEX_SNAPSHOT_VERSION,
      meta,
      layers: [{ name: '0', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [lineBatch],
          meshBatches: [],
          osnap: { primitives: linePrimitives }
        }
      ],
      activeLayoutBtrId: 'ms'
    }
    const curvesOnly = {
      version: ACEX_SNAPSHOT_VERSION,
      meta,
      layers: [{ name: '0', color: 0xffffff, visible: true }],
      layouts: [
        {
          btrId: 'ms',
          name: '*Model_Space',
          isModelSpace: true,
          lineBatches: [lineBatch],
          meshBatches: [],
          osnap: {
            primitives: [
              {
                kind: 'circle' as const,
                layer: '0',
                cx: 5,
                cy: 5,
                r: 2,
                normalSign: 1 as const
              }
            ]
          }
        }
      ],
      activeLayoutBtrId: 'ms'
    }

    const legacyPayload = encodeSnapshot(withDuplicatedLines).payload
    const compactPayload = encodeSnapshot(curvesOnly).payload
    expect(compactPayload.length).toBeLessThan(legacyPayload.length * 0.25)

    const decoded = decodeSnapshot(compactPayload)
    expect(decoded.layouts[0]!.osnap?.primitives.every(p => p.kind !== 'line')).toBe(
      true
    )
    expect(decoded.layouts[0]!.lineBatches[0]!.positions.length).toBeGreaterThan(0)
  })

  it('round-trips signed renderOrder so hatch fills stay below linework', () => {
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
              offset: [0, 0, 0] as [number, number, number],
              positions: f32([0, 0, 0, 10, 0, 0])
            }
          ],
          meshBatches: [
            {
              layer: '0',
              color: 0x00ff00,
              offset: [0, 0, 0] as [number, number, number],
              positions: f32([0, 0, 0, 1, 0, 0, 0, 1, 0]),
              indices: Uint32Array.from([0, 1, 2]),
              renderOrder: -1
            }
          ]
        }
      ],
      activeLayoutBtrId: 'ms'
    }

    const decoded = decodeSnapshot(encodeSnapshot(snapshot).payload)
    expect(decoded.layouts[0]!.lineBatches[0]!.renderOrder).toBeUndefined()
    expect(decoded.layouts[0]!.meshBatches[0]!.renderOrder).toBe(-1)
  })
})
