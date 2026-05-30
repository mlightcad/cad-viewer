import { toWcsCoord } from '../src/AcExBatchBuffers'
import { AcExOsnapIndex } from '../src/AcExOsnap'

describe('rebase and measurement precision', () => {
  it('combines float32 local vertices with double origins in WCS', () => {
    const origin = 1_000_000_000.5
    const local = 0.125
    expect(toWcsCoord(local, origin)).toBe(1_000_000_000.625)
  })

  it('snaps using analytic osnap primitives stored as number', () => {
    const origin = 5_000_000
    const layout = {
      btrId: 'model',
      name: 'Model',
      isModelSpace: true,
      lineBatches: [],
      meshBatches: [],
      osnap: {
        primitives: [
          {
            kind: 'line' as const,
            layer: '0',
            x0: origin + 0.25,
            y0: origin + 0.5,
            x1: origin + 10.25,
            y1: origin + 0.5
          }
        ]
      }
    }
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout)
    const snap = index.findSnap(origin + 0.26, origin + 0.51, 1)
    expect(snap).toEqual({
      x: origin + 0.25,
      y: origin + 0.5,
      mode: 'endpoint'
    })
  })

  it('derives WCS from rebased batch geometry without baking the origin', () => {
    const origin = 2_000_000_000
    const layout = {
      btrId: 'model',
      name: 'Model',
      isModelSpace: true,
      lineBatches: [
        {
          layer: '0',
          color: 0xffffff,
          offset: [origin, origin, 0] as [number, number, number],
          positions: Float32Array.from([0, 0, 0, 100, 0, 0])
        }
      ],
      meshBatches: []
    }
    const index = new AcExOsnapIndex(['endpoint'])
    index.rebuild(layout)
    const snap = index.findSnap(origin + 0.1, origin + 0.1, 1)
    expect(snap).toEqual({ x: origin, y: origin, mode: 'endpoint' })
  })
})
