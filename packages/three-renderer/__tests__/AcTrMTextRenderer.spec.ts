const mockRendererInstances: Array<{
  setFontUrl: jest.Mock
  setDefaultMode: jest.Mock
  setDefaultFonts: jest.Mock
  setStyleManager: jest.Mock
  destroy: jest.Mock
}> = []

const mockUnifiedRenderer = jest.fn().mockImplementation(() => {
  const renderer = {
    setFontUrl: jest.fn(),
    setDefaultMode: jest.fn(),
    setDefaultFonts: jest.fn(() => Promise.resolve()),
    setStyleManager: jest.fn(),
    destroy: jest.fn()
  }
  mockRendererInstances.push(renderer)
  return renderer
})

jest.mock('@mlightcad/mtext-renderer', () => ({
  UnifiedRenderer: mockUnifiedRenderer,
  createDefaultColorSettings: jest.fn(() => ({}))
}))

import { AcTrMTextRenderer } from '../src/renderer/AcTrMTextRenderer'

describe('AcTrMTextRenderer', () => {
  beforeEach(() => {
    ;(AcTrMTextRenderer as unknown as { _instance: unknown })._instance = null
    mockRendererInstances.length = 0
    mockUnifiedRenderer.mockClear()
  })

  it('applies a custom font URL to the renderer when initialized later', () => {
    const renderer = AcTrMTextRenderer.getInstance()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    renderer.setFontUrl(fontUrl)
    renderer.initialize('https://cdn.example.com/workers/mtext.js')

    expect(mockUnifiedRenderer).toHaveBeenCalledWith('worker', {
      workerUrl: 'https://cdn.example.com/workers/mtext.js'
    })
    expect(mockRendererInstances[0].setFontUrl).toHaveBeenCalledWith(fontUrl)
  })

  it('creates the unified renderer in main mode without eagerly spawning workers', () => {
    const renderer = AcTrMTextRenderer.getInstance()

    renderer.setRenderMode('main')
    renderer.initialize('./assets/mtext-renderer-worker.js')

    expect(mockUnifiedRenderer).toHaveBeenCalledWith('main', {
      workerUrl: './assets/mtext-renderer-worker.js'
    })
    expect(mockRendererInstances[0].setDefaultMode).toHaveBeenCalledWith('main')
  })

  it('creates the unified renderer in worker mode when requested', () => {
    const renderer = AcTrMTextRenderer.getInstance()

    renderer.setRenderMode('worker')
    renderer.initialize('./assets/mtext-renderer-worker.js')

    expect(mockUnifiedRenderer).toHaveBeenCalledWith('worker', {
      workerUrl: './assets/mtext-renderer-worker.js'
    })
    expect(mockRendererInstances[0].setDefaultMode).toHaveBeenCalledWith(
      'worker'
    )
  })

  it('destroys the previous unified renderer before re-initializing', () => {
    const renderer = AcTrMTextRenderer.getInstance()

    renderer.initialize('./assets/mtext-renderer-worker.js')
    renderer.initialize('./assets/mtext-renderer-worker.js')

    expect(mockRendererInstances).toHaveLength(2)
    expect(mockRendererInstances[0].destroy).toHaveBeenCalledTimes(1)
  })

  it('applies a pending custom font URL after restoring the render mode', () => {
    const renderer = AcTrMTextRenderer.getInstance()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    renderer.setRenderMode('main')
    renderer.setFontUrl(fontUrl)
    renderer.initialize('./assets/mtext-renderer-worker.js')

    const rendererInstance = mockRendererInstances[0]
    expect(mockUnifiedRenderer).toHaveBeenCalledWith('main', {
      workerUrl: './assets/mtext-renderer-worker.js'
    })
    expect(rendererInstance.setFontUrl).toHaveBeenCalledWith(fontUrl)
  })

  it('forwards a custom font URL to an initialized renderer immediately', () => {
    const renderer = AcTrMTextRenderer.getInstance()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    renderer.initialize('./assets/mtext-renderer-worker.js')
    renderer.setFontUrl(fontUrl)

    expect(mockRendererInstances[0].setFontUrl).toHaveBeenCalledWith(fontUrl)
  })

  it('reapplies the custom font URL when switching render modes', () => {
    const renderer = AcTrMTextRenderer.getInstance()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    renderer.initialize('./assets/mtext-renderer-worker.js')
    renderer.setFontUrl(fontUrl)
    mockRendererInstances[0].setFontUrl.mockClear()

    renderer.setRenderMode('main')

    expect(mockRendererInstances[0].setDefaultMode).toHaveBeenCalledWith('main')
    expect(mockRendererInstances[0].setFontUrl).toHaveBeenCalledWith(fontUrl)
  })

  it('applies a pending default fonts preset when initialized later', async () => {
    const renderer = AcTrMTextRenderer.getInstance()

    await renderer.setDefaultFonts('modern')
    renderer.initialize('./assets/mtext-renderer-worker.js')

    expect(mockRendererInstances[0].setDefaultFonts).toHaveBeenCalledWith(
      'modern'
    )
  })

  it('forwards default fonts preset to an initialized renderer immediately', async () => {
    const renderer = AcTrMTextRenderer.getInstance()

    renderer.initialize('./assets/mtext-renderer-worker.js')
    await renderer.setDefaultFonts('r12r14')

    expect(mockRendererInstances[0].setDefaultFonts).toHaveBeenCalledWith(
      'r12r14'
    )
  })
})
