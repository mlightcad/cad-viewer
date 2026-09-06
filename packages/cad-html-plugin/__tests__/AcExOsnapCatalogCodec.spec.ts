import {
  decodeOsnapCatalogGzip,
  encodeOsnapCatalogBinary,
  encodeOsnapCatalogGzip,
  splitOsnapPrimitives
} from '../src/AcExOsnapCatalogCodec'
import type { AcExOsnapCatalog } from '../src/AcExOsnapPrimitiveTypes'

describe('AcExOsnapCatalogCodec', () => {
  it('round-trips mixed primitive kinds through ACEO gzip', () => {
    const catalog: AcExOsnapCatalog = {
      primitives: [
        { kind: 'line', layer: '0', x0: 1, y0: 2, x1: 3, y1: 4 },
        { kind: 'circle', layer: 'L1', cx: 0, cy: 0, r: 5, normalSign: -1 },
        {
          kind: 'arc',
          layer: 'L1',
          cx: 1,
          cy: 1,
          r: 2,
          startAngle: 0,
          endAngle: Math.PI,
          normalSign: 1
        },
        {
          kind: 'ellipse',
          layer: '0',
          cx: 0,
          cy: 0,
          majorX: 1,
          majorY: 0,
          majorR: 4,
          minorR: 2,
          startAngle: 0,
          endAngle: Math.PI * 2,
          closed: true,
          normalSign: 1
        },
        {
          kind: 'spline',
          layer: 'S',
          controlPoints: [0, 0, 1, 1, 2, 0],
          degree: 2,
          knots: [0, 0, 0, 1, 1, 1],
          weights: [1, 1, 1],
          closed: false,
          fitPoints: [0, 0, 2, 0]
        },
        { kind: 'point', layer: '0', x: 9, y: 8 },
        {
          kind: 'path',
          layer: 'H',
          closed: true,
          vertices: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]
        }
      ]
    }

    const { compressed } = encodeOsnapCatalogGzip(catalog)
    expect(compressed[0]).toBe(0x1f)
    expect(compressed[1]).toBe(0x8b)

    const decoded = decodeOsnapCatalogGzip(compressed)
    expect(decoded).toEqual(catalog)
  })

  it('is much smaller than JSON for dense line catalogs', () => {
    const primitives = Array.from({ length: 2000 }, (_, i) => ({
      kind: 'line' as const,
      layer: i % 2 === 0 ? 'A' : 'B',
      x0: i,
      y0: i + 0.5,
      x1: i + 1,
      y1: i + 1.5
    }))
    const catalog: AcExOsnapCatalog = { primitives }
    const jsonBytes = Buffer.byteLength(JSON.stringify(catalog))
    const binaryBytes = encodeOsnapCatalogBinary(catalog).byteLength
    expect(binaryBytes).toBeLessThan(jsonBytes * 0.6)
  })

  it('splits dense catalogs into multiple slices', () => {
    const primitives = Array.from({ length: 100 }, (_, i) => ({
      kind: 'line' as const,
      layer: '0',
      x0: i,
      y0: 0,
      x1: i + 1,
      y1: 1
    }))
    const slices = splitOsnapPrimitives(primitives, 200)
    expect(slices.length).toBeGreaterThan(1)
    expect(slices.reduce((n, s) => n + s.length, 0)).toBe(100)
  })
})

describe('AcExOsnapIndex.rebuildAsync', () => {
  it('bulk-loads RBush after building entries and yields on wall-clock budget', async () => {
    const { AcExOsnapIndex } = await import('../src/AcExOsnap')
    // Must exceed OSNAP_INDEX_YIELD_CHECK_EVERY (1024) so the scheduler samples
    // the wall-clock budget at least once.
    const primitiveCount = 9000
    const primitives = Array.from({ length: primitiveCount }, (_, i) => ({
      kind: 'line' as const,
      layer: '0',
      x0: i,
      y0: 0,
      x1: i + 1,
      y1: 1
    }))
    let yields = 0
    let nowCall = 0
    const nowSpy = jest
      .spyOn(performance, 'now')
      .mockImplementation(() => (nowCall++) * 250)
    const index = new AcExOsnapIndex()
    const loadSpy = jest.spyOn(
      (index as unknown as { primitiveTree: { load: (e: unknown) => void } })
        .primitiveTree,
      'load'
    )
    await index.rebuildAsync(
      {
        btrId: 'ms',
        name: 'Model',
        isModelSpace: true,
        lineBatches: [],
        meshBatches: [],
        osnap: { primitives }
      },
      async () => {
        yields += 1
      }
    )
    expect(yields).toBeGreaterThan(0)
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(
      (loadSpy.mock.calls[0]![0] as unknown[]).length
    ).toBe(primitiveCount)
    const snap = index.findSnap(10.1, 0.1, 2)
    expect(snap).toBeTruthy()
    loadSpy.mockRestore()
    nowSpy.mockRestore()
  })
})
