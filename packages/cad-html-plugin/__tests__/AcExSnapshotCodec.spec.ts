import { decodeSnapshot, encodeSnapshot } from '../src/AcExSnapshotCodec'
import { ACEX_SNAPSHOT_VERSION } from '../src/AcExSnapshotTypes'

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
})
