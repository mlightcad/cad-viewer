const mockRendererInstances: Array<{
  setFontUrl: jest.Mock
  setDefaultMode: jest.Mock
  setStyleManager: jest.Mock
  destroy: jest.Mock
}> = []

const mockUnifiedRenderer = jest.fn().mockImplementation(() => {
  const renderer = {
    setFontUrl: jest.fn(),
    setDefaultMode: jest.fn(),
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

  it('forwards a custom font URL to an initialized renderer immediately', () => {
    const renderer = AcTrMTextRenderer.getInstance()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    renderer.initialize('./assets/mtext-renderer-worker.js')
    renderer.setFontUrl(fontUrl)

    expect(mockRendererInstances[0].setFontUrl).toHaveBeenCalledWith(fontUrl)
  })
})
