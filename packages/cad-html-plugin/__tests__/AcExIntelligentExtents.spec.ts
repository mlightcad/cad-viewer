import {
  collectLayoutBatchExtentEntries,
  computeIntelligentExtentsFromBatchEntries
} from '../src/AcExLayerExtents'
import type { AcExLineBatch } from '../src/AcExSnapshotTypes'

function makeLineBatch(
  layer: string,
  positions: number[],
  offset: [number, number, number] = [0, 0, 0]
): AcExLineBatch {
  return {
    layer,
    color: 0xffffff,
    offset,
    positions: new Float32Array(positions)
  }
}

describe('computeIntelligentExtentsFromBatchEntries', () => {
  it('drops outlier-scale batch AABBs after CPU release (no vertex samples)', () => {
    const siteBatches = Array.from({ length: 10 }, (_, i) =>
      makeLineBatch('site', [
        490000 + i * 100,
        3420000,
        0,
        490050 + i * 100,
        3420100,
        0
      ])
    )
    const poison = makeLineBatch('0-DL', [
      495000,
      3422000,
      0,
      1.5e75,
      5e63,
      0
    ])
    const layout = {
      lineBatches: [...siteBatches, poison],
      meshBatches: [] as never[]
    }
    const entries = collectLayoutBatchExtentEntries(layout)
    expect(entries.length).toBe(11)

    // Simulate CPU release: no sampleFromLayout.
    const smart = computeIntelligentExtentsFromBatchEntries(entries)
    expect(smart).not.toBeNull()
    expect(smart!.maxX).toBeLessThan(1e10)
    expect(smart!.minX).toBeGreaterThan(489000)
  })

  it('still peels outliers when only a few batches remain', () => {
    const entries = [
      {
        layer: 'a',
        extents: { minX: 490000, minY: 3420000, maxX: 491000, maxY: 3421000 }
      },
      {
        layer: 'b',
        extents: { minX: 492000, minY: 3420000, maxX: 493000, maxY: 3421000 }
      },
      {
        layer: 'c',
        extents: { minX: 1e75, minY: 1e63, maxX: 1e75 + 1, maxY: 1e63 + 1 }
      }
    ]
    const smart = computeIntelligentExtentsFromBatchEntries(entries)
    expect(smart).not.toBeNull()
    expect(smart!.maxX).toBeLessThan(1e10)
  })
})
