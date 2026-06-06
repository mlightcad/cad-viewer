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

import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

import { AcApPngConvertor } from '../src/command/convert/AcApPngConvertor'

type PngConvertorTestApi = {
  resolveOutputSize: (
    longSide: number,
    aspect: number
  ) => { width: number; height: number }
  resolveRenderSizeForCenterCrop: (
    targetWidth: number,
    targetHeight: number,
    sourceAspect: number
  ) => { width: number; height: number }
  getBoundsAspect: (bounds: AcGeBox2d) => number
}

function convertorApi(): PngConvertorTestApi {
  return new AcApPngConvertor() as unknown as PngConvertorTestApi
}

describe('AcApPngConvertor sizing helpers', () => {
  it('resolveOutputSize keeps long side on width for landscape aspect', () => {
    const api = convertorApi()

    expect(api.resolveOutputSize(1024, 2)).toEqual({
      width: 1024,
      height: 512
    })
  })

  it('resolveOutputSize keeps long side on height for portrait aspect', () => {
    const api = convertorApi()

    expect(api.resolveOutputSize(1024, 0.5)).toEqual({
      width: 512,
      height: 1024
    })
  })

  it('resolveRenderSizeForCenterCrop extends width when source is wider', () => {
    const api = convertorApi()

    expect(api.resolveRenderSizeForCenterCrop(800, 600, 2)).toEqual({
      width: 1200,
      height: 600
    })
  })

  it('resolveRenderSizeForCenterCrop extends height when source is taller', () => {
    const api = convertorApi()

    expect(api.resolveRenderSizeForCenterCrop(800, 600, 0.5)).toEqual({
      width: 800,
      height: 1600
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
