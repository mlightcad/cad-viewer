import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      curView: null
    }
  }
}))

jest.mock('../src/view', () => ({
  AcTrView2d: class AcTrView2d {}
}))

import { AcApEntityPreviewConvertor } from '../src/command/convert/AcApEntityPreviewConvertor'

type EntityPreviewConvertorTestApi = {
  resolveOutputSize: (
    longSide: number,
    aspect: number
  ) => { width: number; height: number }
  getBoundsAspect: (bounds: AcGeBox2d) => number
}

function convertorApi(): EntityPreviewConvertorTestApi {
  return new AcApEntityPreviewConvertor() as unknown as EntityPreviewConvertorTestApi
}

describe('AcApEntityPreviewConvertor sizing helpers', () => {
  it('resolveOutputSize keeps long side on width for landscape aspect', () => {
    const api = convertorApi()

    expect(api.resolveOutputSize(512, 2)).toEqual({
      width: 512,
      height: 256
    })
  })

  it('resolveOutputSize keeps long side on height for portrait aspect', () => {
    const api = convertorApi()

    expect(api.resolveOutputSize(512, 0.5)).toEqual({
      width: 256,
      height: 512
    })
  })

  it('getBoundsAspect uses absolute box dimensions', () => {
    const api = convertorApi()
    const bounds = new AcGeBox2d(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(200, 50)
    )

    expect(api.getBoundsAspect(bounds)).toBeCloseTo(4)
  })
})
