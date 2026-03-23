import { AcGeLine3d } from '../src'

describe('Test AcGeLine3d', () => {
  it('computes length correctly', () => {
    const line1 = new AcGeLine3d({ x: 1, y: 1, z: 1 }, { x: 1, y: 0, z: 1 })
    expect(line1.length).toBe(1)
  })
})
