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
import {
  AcApFontLoader,
  getLastFontLoadStats
} from '../src/app/AcApFontLoader'

describe('AcApFontLoader', () => {
  beforeEach(() => {
    mockLoad.mockReset()
    mockGetAvailableFonts.mockReset()
    mockGetAvailableFonts.mockResolvedValue([])
    mockLoad.mockResolvedValue([])
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

  it('awaits SHX fonts and defers mesh fonts for explicit multi-font loads', async () => {
    const loader = new AcApFontLoader()
    mockGetAvailableFonts.mockResolvedValue([
      {
        name: ['hztxt'],
        file: 'hztxt.shx',
        type: 'shx',
        url: 'https://cdn.example.com/hztxt.shx'
      },
      {
        name: ['simsun'],
        file: 'simsun.woff',
        type: 'mesh',
        url: 'https://cdn.example.com/simsun.woff'
      }
    ])

    let resolveMesh: (value: unknown) => void = () => undefined
    const meshGate = new Promise(resolve => {
      resolveMesh = resolve
    })
    mockLoad.mockImplementation((names: string[]) => {
      if (names.includes('simsun')) {
        return meshGate.then(() => [
          {
            fontName: 'simsun',
            url: 'https://cdn.example.com/simsun.woff',
            status: 'Success'
          }
        ])
      }
      return Promise.resolve([
        {
          fontName: 'hztxt',
          url: 'https://cdn.example.com/hztxt.shx',
          status: 'Success'
        }
      ])
    })

    await loader.load(['hztxt', 'simsun'])

    expect(mockLoad).toHaveBeenCalledWith(['hztxt'])
    expect(mockLoad).toHaveBeenCalledWith(['simsun'])
    const stats = getLastFontLoadStats()
    expect(stats?.criticalFonts).toEqual(['hztxt'])
    expect(stats?.deferredFonts).toEqual(['simsun'])
    expect(stats?.deferred).toBe(true)
    // Fire-and-forget mesh load has not finished yet.
    expect(stats?.deferredLoadMs).toBeNull()

    resolveMesh([])
    // meshGate → mockLoad then → stats update (nested microtasks)
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(getLastFontLoadStats()?.deferredLoadMs).toEqual(expect.any(Number))
  })

  it('can load mesh fonts synchronously when deferMeshFonts is false', async () => {
    const loader = new AcApFontLoader()
    loader.deferMeshFonts = false
    mockGetAvailableFonts.mockResolvedValue([
      {
        name: ['simsun'],
        file: 'simsun.woff',
        type: 'mesh',
        url: 'https://cdn.example.com/simsun.woff'
      }
    ])
    mockLoad.mockResolvedValue([
      {
        fontName: 'simsun',
        url: 'https://cdn.example.com/simsun.woff',
        status: 'Success'
      }
    ])

    await loader.load(['simsun'])

    expect(mockLoad).toHaveBeenCalledWith(['simsun'])
    expect(getLastFontLoadStats()?.deferred).toBe(false)
  })

  it('awaits mesh-only loads even when deferMeshFonts is true', async () => {
    const loader = new AcApFontLoader()
    mockGetAvailableFonts.mockResolvedValue([
      {
        name: ['simsun'],
        file: 'simsun.woff',
        type: 'mesh',
        url: 'https://cdn.example.com/simsun.woff'
      }
    ])

    let resolveMesh: (value: unknown) => void = () => undefined
    const meshGate = new Promise(resolve => {
      resolveMesh = resolve
    })
    mockLoad.mockImplementation(() =>
      meshGate.then(() => [
        {
          fontName: 'simsun',
          url: 'https://cdn.example.com/simsun.woff',
          status: 'Success'
        }
      ])
    )

    let settled = false
    const loadPromise = loader.load(['simsun']).then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)

    resolveMesh([])
    await loadPromise

    expect(settled).toBe(true)
    expect(getLastFontLoadStats()?.deferred).toBe(false)
    expect(getLastFontLoadStats()?.deferredFonts).toEqual(['simsun'])
  })
})
