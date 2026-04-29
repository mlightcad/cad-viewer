import { sortPickResults } from '../src/view/AcTrPickResultUtil'

describe('sortPickResults', () => {
  test('prefers local geometry over a larger overlapping candidate', () => {
    const results = sortPickResults(
      [
        {
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 100,
          id: 'TABLE'
        },
        {
          minX: 50,
          minY: 50,
          maxX: 51,
          maxY: 51,
          id: 'LINE'
        }
      ],
      { x: 50.5, y: 50.5 }
    )

    expect(results.map(item => item.id)).toEqual(['LINE', 'TABLE'])
  })

  test('uses distance as a tie breaker for equal-size candidates', () => {
    const results = sortPickResults(
      [
        {
          minX: 20,
          minY: 20,
          maxX: 30,
          maxY: 30,
          id: 'FAR'
        },
        {
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
          id: 'NEAR'
        }
      ],
      { x: 8, y: 8 }
    )

    expect(results.map(item => item.id)).toEqual(['NEAR', 'FAR'])
  })
})
