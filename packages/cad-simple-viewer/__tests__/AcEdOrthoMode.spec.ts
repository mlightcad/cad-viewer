import { constrainToOrtho } from '../src/editor/input/AcEdOrthoMode'

describe('constrainToOrtho', () => {
  const reference = { x: 10, y: 20 }

  it('locks Y when horizontal movement dominates', () => {
    expect(constrainToOrtho({ x: 30, y: 25 }, reference)).toEqual({
      x: 30,
      y: 20
    })
  })

  it('locks X when vertical movement dominates', () => {
    expect(constrainToOrtho({ x: 12, y: 40 }, reference)).toEqual({
      x: 10,
      y: 40
    })
  })
})
