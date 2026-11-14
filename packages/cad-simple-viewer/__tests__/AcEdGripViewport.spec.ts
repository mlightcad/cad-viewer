import { acedPickViewportForModelExtents } from '../src/editor/grip/AcEdGripViewport'

describe('acedPickViewportForModelExtents', () => {
  const vpA = {
    viewportId: 'vp-a',
    viewBox: { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } }
  }
  const vpB = {
    viewportId: 'vp-b',
    viewBox: { min: { x: 200, y: 200 }, max: { x: 300, y: 300 } }
  }

  test('returns undefined when there are no candidates', () => {
    expect(
      acedPickViewportForModelExtents(
        { min: { x: 10, y: 10 }, max: { x: 20, y: 20 } },
        []
      )
    ).toBeUndefined()
  })

  test('prefers the click-pick viewport when it is still a candidate', () => {
    expect(
      acedPickViewportForModelExtents(
        { min: { x: 10, y: 10 }, max: { x: 20, y: 20 } },
        [vpA, vpB],
        'vp-b'
      )
    ).toBe('vp-b')
  })

  test('ignores a preferred id that is no longer a candidate', () => {
    expect(
      acedPickViewportForModelExtents(
        { min: { x: 10, y: 10 }, max: { x: 20, y: 20 } },
        [vpA, vpB],
        'vp-gone'
      )
    ).toBe('vp-a')
  })

  test('picks the viewport whose viewBox overlaps entity extents', () => {
    expect(
      acedPickViewportForModelExtents(
        { min: { x: 210, y: 210 }, max: { x: 220, y: 220 } },
        [vpA, vpB]
      )
    ).toBe('vp-b')
  })

  test('falls back to the first candidate when extents are missing', () => {
    expect(acedPickViewportForModelExtents(undefined, [vpA, vpB])).toBe(
      'vp-a'
    )
  })

  test('falls back to the first candidate when no viewBox overlaps', () => {
    expect(
      acedPickViewportForModelExtents(
        { min: { x: -50, y: -50 }, max: { x: -10, y: -10 } },
        [vpA, vpB]
      )
    ).toBe('vp-a')
  })
})
