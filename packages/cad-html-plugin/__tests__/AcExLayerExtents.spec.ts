import {
  computeLayerExtentsMap,
  computeLayoutExtents,
  computeLayoutViewExtents,
  resolveLayoutViewExtents
} from '../src/AcExLayerExtents'

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

describe('AcExLayerExtents', () => {
  it('computes per-layer bounds from batches', () => {
    const map = computeLayerExtentsMap(
      [
        {
          layer: 'A',
          color: 0,
          offset: [0, 0, 0],
          positions: f32([0, 0, 0, 10, 5, 0])
        }
      ],
      [
        {
          layer: 'B',
          color: 0,
          offset: [1, 2, 0],
          positions: f32([0, 0, 0, 2, 2, 0])
        }
      ]
    )
    expect(map.get('A')).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 5
    })
    expect(map.get('B')).toEqual({
      minX: 1,
      minY: 2,
      maxX: 3,
      maxY: 4
    })
  })

  it('unions all batches into one layout extent', () => {
    expect(
      computeLayoutExtents(
        [
          {
            layer: 'A',
            color: 0,
            offset: [0, 0, 0],
            positions: f32([0, 0, 0, 10, 5, 0])
          }
        ],
        [
          {
            layer: 'B',
            color: 0,
            offset: [1, 2, 0],
            positions: f32([0, 0, 0, 2, 2, 0])
          }
        ]
      )
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 5
    })
  })

  it('prefers batch extents over persisted viewExtents fallback', () => {
    expect(
      resolveLayoutViewExtents(
        {
          lineBatches: [
            {
              layer: '0',
              color: 0,
              offset: [0, 0, 0],
              positions: f32([0, 0, 0, 5, 5, 0])
            }
          ],
          meshBatches: []
        },
        { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
      )
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 5,
      maxY: 5
    })
  })

  it('unions viewport paper frames when a paper layout has no batches', () => {
    expect(
      computeLayoutViewExtents({
        lineBatches: [],
        meshBatches: [],
        viewports: [
          {
            paper: { minX: 0, minY: 0, maxX: 12, maxY: 9 },
            model: { minX: 100, minY: 200, maxX: 400, maxY: 500 }
          },
          {
            paper: { minX: 20, minY: 4, maxX: 40, maxY: 30 },
            model: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
          }
        ]
      })
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 40,
      maxY: 30
    })
  })

  it('frames empty paper layouts to viewport paper instead of the unit box', () => {
    expect(
      resolveLayoutViewExtents({
        lineBatches: [],
        meshBatches: [],
        viewports: [
          {
            paper: { minX: 2, minY: 3, maxX: 14, maxY: 12 },
            model: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
          }
        ]
      })
    ).toEqual({
      minX: 2,
      minY: 3,
      maxX: 14,
      maxY: 12
    })
  })
})
