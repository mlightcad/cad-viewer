import { AcTrRBushSpatialIndex } from '../src/spatialIndex/AcTrRBushSpatialIndex'

describe('AcTrRBushSpatialIndex', () => {
  test('rejects NaN bboxes so one bad insert cannot poison all searches', () => {
    const index = new AcTrRBushSpatialIndex()
    for (let i = 0; i < 50; i++) {
      index.insert({
        minX: 360000 + i,
        minY: 3535000,
        maxX: 360000 + i + 10,
        maxY: 3535010,
        id: `ok-${i}`
      })
    }

    expect(
      index.search({
        minX: 360000,
        minY: 3535000,
        maxX: 360100,
        maxY: 3535200
      }).length
    ).toBeGreaterThan(0)

    index.insert({
      minX: NaN,
      minY: NaN,
      maxX: NaN,
      maxY: NaN,
      id: 'nan-box'
    })
    index.insert({
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      id: 'empty-inf'
    })

    const hits = index.search({
      minX: 360000,
      minY: 3535000,
      maxX: 360100,
      maxY: 3535200
    })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(h => h.id.startsWith('ok-'))).toBe(true)
    expect(index.all().some(h => h.id === 'nan-box')).toBe(false)
  })

  test('load filters non-finite items before bulk packing', () => {
    const index = new AcTrRBushSpatialIndex()
    index.load([
      { minX: 0, minY: 0, maxX: 1, maxY: 1, id: 'a' },
      { minX: NaN, minY: 0, maxX: 1, maxY: 1, id: 'bad' },
      { minX: 10, minY: 10, maxX: 11, maxY: 11, id: 'b' }
    ])

    expect(index.all().map(item => item.id).sort()).toEqual(['a', 'b'])
    expect(
      index.search({ minX: -1, minY: -1, maxX: 12, maxY: 12 }).map(h => h.id)
    ).toEqual(expect.arrayContaining(['a', 'b']))
  })
})
