import { AcTrImage } from '../src/object/AcTrImage'

describe('AcTrImage', () => {
  it('always unbatches without consulting policy', () => {
    expect(AcTrImage.prototype.resolveDrawMode.call({})).toBe('unbatch')
  })
})
