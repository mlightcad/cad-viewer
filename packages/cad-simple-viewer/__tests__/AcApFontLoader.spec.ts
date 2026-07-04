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

import { eventBus } from '../src/editor'
import { AcApFontLoader } from '../src/app/AcApFontLoader'

describe('AcApFontLoader', () => {
  beforeEach(() => {
    mockLoad.mockReset()
    mockGetAvailableFonts.mockReset()
    jest.mocked(eventBus.emit).mockClear()
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

  it('wraps catastrophic font load failures as font_load_failed errors', async () => {
    const loader = new AcApFontLoader()
    mockLoad.mockRejectedValueOnce(new Error('Failed to fetch'))

    await expect(loader.load(['arial'])).rejects.toMatchObject({
      code: 'font_load_failed',
      message: 'Failed to fetch'
    })
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  it('emits fonts-not-loaded for partial load failures', async () => {
    const loader = new AcApFontLoader()
    mockLoad.mockResolvedValueOnce([
      {
        fontName: 'missing',
        url: 'https://cdn.example.com/missing.shx',
        status: 'FailedToLoad'
      }
    ])

    await loader.load(['missing'])

    expect(eventBus.emit).toHaveBeenCalledWith('fonts-not-loaded', {
      fonts: [
        {
          fontName: 'missing',
          url: 'https://cdn.example.com/missing.shx'
        }
      ]
    })
  })
})
