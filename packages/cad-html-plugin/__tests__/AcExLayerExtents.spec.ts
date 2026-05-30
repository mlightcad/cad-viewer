import { computeLayerExtentsMap } from '../src/AcExLayerExtents'

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
})
