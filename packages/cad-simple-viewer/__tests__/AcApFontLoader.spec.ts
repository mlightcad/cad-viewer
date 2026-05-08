const mockLoad = jest.fn()
const mockGetAvailableFonts = jest.fn()

class MockAcTrFontLoader {
  private _baseUrl = ''
  avaiableFonts = []

  get baseUrl() {
    return this._baseUrl
  }

  set baseUrl(value: string) {
    this._baseUrl = value
  }

  getAvailableFonts = mockGetAvailableFonts
  load = mockLoad
}

jest.mock('@mlightcad/three-renderer', () => ({
  AcTrFontLoader: MockAcTrFontLoader
}))

jest.mock('../src/editor', () => ({
  eventBus: {
    emit: jest.fn()
  }
}))

import { AcApFontLoader } from '../src/app/AcApFontLoader'

describe('AcApFontLoader', () => {
  beforeEach(() => {
    mockLoad.mockReset()
    mockGetAvailableFonts.mockReset()
  })

  it('passes the custom base URL to the underlying font loader before loading fonts', async () => {
    const loader = new AcApFontLoader()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    loader.baseUrl = fontUrl
    mockLoad.mockImplementationOnce(function (
      this: MockAcTrFontLoader,
      _fontNames: string[]
    ) {
      return Promise.resolve([
        {
          fontName: 'simkai',
          url: `${this.baseUrl}simkai.shx`,
          status: 'Success'
        }
      ])
    })

    await loader.load(['simkai'])

    expect(mockLoad).toHaveBeenCalledWith(['simkai'])
    expect(mockLoad.mock.contexts[0].baseUrl).toBe(fontUrl)
  })
})
