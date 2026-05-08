const mockSetFontUrl = jest.fn()

jest.mock('@mlightcad/mtext-renderer', () => {
  class MockDefaultFontLoader {
    private _baseUrl = 'https://mlightcad.gitlab.io/cad-data/fonts/'

    get baseUrl() {
      return this._baseUrl
    }

    set baseUrl(value: string) {
      if (this._baseUrl === value) {
        return
      }
      this._baseUrl = value
      this.onFontUrlChanged(value)
    }

    onFontUrlChanged(_url: string) {
      // Hook for subclasses.
    }
  }

  return {
    DefaultFontLoader: MockDefaultFontLoader
  }
})

jest.mock('../src/renderer/AcTrMTextRenderer', () => ({
  AcTrMTextRenderer: {
    getInstance: jest.fn(() => ({
      setFontUrl: mockSetFontUrl
    }))
  }
}))

import { AcTrFontLoader } from '../src/renderer/AcTrFontLoader'

describe('AcTrFontLoader', () => {
  beforeEach(() => {
    mockSetFontUrl.mockClear()
  })

  it('notifies the MText renderer when the custom font base URL changes', () => {
    const loader = new AcTrFontLoader()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    loader.baseUrl = fontUrl

    expect(mockSetFontUrl).toHaveBeenCalledWith(fontUrl)
  })
})
