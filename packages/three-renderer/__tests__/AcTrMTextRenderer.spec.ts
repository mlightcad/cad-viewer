const mockRendererInstances: Array<{
  setFontUrl: jest.Mock
  setDefaultMode: jest.Mock
  setDefaultFonts: jest.Mock
  setStyleManager: jest.Mock
  loadFonts: jest.Mock
  asyncRenderMText: jest.Mock
  asyncRenderShape: jest.Mock
  destroy: jest.Mock
}> = []

const mockUnifiedRenderer = jest.fn().mockImplementation(() => {
  const renderer = {
    setFontUrl: jest.fn(),
    setDefaultMode: jest.fn(),
    setDefaultFonts: jest.fn(() => Promise.resolve()),
    setStyleManager: jest.fn(),
    loadFonts: jest.fn(() => Promise.resolve({ loaded: [] })),
    asyncRenderMText: jest.fn(() => Promise.resolve({})),
    asyncRenderShape: jest.fn(() => Promise.resolve({})),
    destroy: jest.fn()
  }
  mockRendererInstances.push(renderer)
  return renderer
})
const mockFontManager = {
  getFontsToLoad: jest.fn(() => ['txt', 'symbol']),
  requestFonts: jest.fn(() => Promise.resolve([]))
}

jest.mock('@mlightcad/mtext-renderer', () => ({
  UnifiedRenderer: mockUnifiedRenderer,
  FontManager: { instance: mockFontManager },
  createDefaultColorSettings: jest.fn(() => ({}))
}))

import { log } from '@mlightcad/data-model'

import { AcTrMTextRenderer } from '../src/renderer/AcTrMTextRenderer'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'

describe('AcTrMTextRenderer', () => {
  beforeEach(() => {
    ;(AcTrMTextRenderer as unknown as { _instance: unknown })._instance = null
    mockRendererInstances.length = 0
    mockUnifiedRenderer.mockClear()
    mockFontManager.getFontsToLoad.mockClear()
    mockFontManager.requestFonts.mockClear()
  })

  it('keeps configuration idle and warms only the actual drawing pipeline', async () => {
    const configuration = AcTrMTextRenderer.getInstance()
    configuration.setWorkerUrl('/mtext-worker.js')
    const scope = configuration.createScope(new AcTrStyleManager())
    expect(mockRendererInstances).toHaveLength(0)

    const ready = scope.ensureDefaultFontsReady()
    expect(scope.ensureDefaultFontsReady()).toBe(ready)
    await ready
    expect(mockRendererInstances).toHaveLength(1)
    expect(mockUnifiedRenderer).toHaveBeenCalledWith('worker', {
      workerUrl: '/mtext-worker.js'
    })
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledTimes(1)
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledWith(
      ['txt', 'symbol'],
      { scope: 'all' }
    )
    expect(mockFontManager.requestFonts).not.toHaveBeenCalled()
    scope.dispose()
  })

  it('warms main-thread fallback fonts without creating a worker pipeline', async () => {
    const configuration = AcTrMTextRenderer.getInstance()
    configuration.setRenderMode('main')
    const scope = configuration.createScope(new AcTrStyleManager())
    await scope.ensureDefaultFontsReady()
    expect(mockFontManager.requestFonts).toHaveBeenCalledWith(['txt', 'symbol'])
    expect(mockRendererInstances).toHaveLength(0)
    scope.dispose()
  })

  it.each(['asyncRenderMText', 'asyncRenderShape'] as const)(
    '%s waits for fallback readiness in the drawing pipeline',
    async method => {
      const configuration = AcTrMTextRenderer.getInstance()
      configuration.setWorkerUrl('/mtext-worker.js')
      const scope = configuration.createScope(new AcTrStyleManager())
      scope.initialize()
      let finishLoad!: () => void
      const renderer = mockRendererInstances[0]
      renderer.loadFonts.mockImplementation(
        () =>
          new Promise<void>(resolve => {
            finishLoad = resolve
          })
      )
      const result = scope[method]({} as never, {} as never)
      expect(renderer[method]).not.toHaveBeenCalled()
      finishLoad()
      await result
      expect(renderer[method]).toHaveBeenCalledTimes(1)
      scope.dispose()
    }
  )

  it.each(['asyncRenderMText', 'asyncRenderShape'] as const)(
    '%s does not dispatch after disposal during font preload',
    async method => {
      const configuration = AcTrMTextRenderer.getInstance()
      configuration.setWorkerUrl('/mtext-worker.js')
      const scope = configuration.createScope(new AcTrStyleManager())
      scope.initialize()
      const renderer = mockRendererInstances[0]
      renderer.loadFonts.mockReturnValue(new Promise(() => {}))
      const result = scope[method]({} as never, {} as never)
      scope.dispose()
      await expect(result).rejects.toThrow('disposed')
      expect(renderer[method]).not.toHaveBeenCalled()
      expect(mockRendererInstances).toHaveLength(1)
    }
  )

  it('rejects an obsolete draw when the pipeline is reinitialized during preload', async () => {
    const configuration = AcTrMTextRenderer.getInstance()
    configuration.setWorkerUrl('/mtext-worker.js')
    const scope = configuration.createScope(new AcTrStyleManager())
    scope.initialize()
    mockRendererInstances[0].loadFonts.mockReturnValue(new Promise(() => {}))
    const result = scope.asyncRenderMText({} as never, {} as never)
    scope.initialize()
    await expect(result).rejects.toThrow('replaced')
    expect(mockRendererInstances[0].asyncRenderMText).not.toHaveBeenCalled()
    expect(mockRendererInstances[1].asyncRenderMText).not.toHaveBeenCalled()
    scope.dispose()
  })

  it('ends pending preload on disposal and prevents scoped worker resurrection', async () => {
    jest.useFakeTimers()
    try {
      const configuration = AcTrMTextRenderer.getInstance()
      configuration.setWorkerUrl('/mtext-worker.js')
      const scope = configuration.createScope(new AcTrStyleManager())
      scope.initialize()
      let finishLoad!: () => void
      mockRendererInstances[0].loadFonts.mockImplementation(
        () =>
          new Promise<void>(resolve => {
            finishLoad = resolve
          })
      )
      const ready = scope.ensureDefaultFontsReady()
      expect(jest.getTimerCount()).toBe(1)
      scope.dispose()
      await ready
      expect(jest.getTimerCount()).toBe(0)
      finishLoad()
      await Promise.resolve()
      expect(scope.getRendererLoadedFontCount()).toBe(0)
      await expect(scope.loadFonts(['late'])).rejects.toThrow('disposed')
      expect(() => scope.initialize('/late-worker.js')).toThrow('disposed')
      expect(() => scope.ensureDefaultFontsReady()).toThrow('disposed')
      expect(mockRendererInstances).toHaveLength(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it('preserves the existing fallback deadline when a font request stalls', async () => {
    jest.useFakeTimers()
    const configuration = AcTrMTextRenderer.getInstance()
    configuration.setWorkerUrl('/mtext-worker.js')
    const scope = configuration.createScope(new AcTrStyleManager())
    try {
      scope.initialize()
      mockRendererInstances[0].loadFonts.mockReturnValue(new Promise(() => {}))
      const ready = scope.ensureDefaultFontsReady()
      const settled = jest.fn()
      void ready.then(settled)
      jest.advanceTimersByTime(29_999)
      await Promise.resolve()
      expect(settled).not.toHaveBeenCalled()
      jest.advanceTimersByTime(1)
      await ready
      expect(settled).toHaveBeenCalledTimes(1)
    } finally {
      scope.dispose()
      jest.useRealTimers()
    }
  })

  it('allows the application configuration facade to be explicitly reinitialized', () => {
    const configuration = AcTrMTextRenderer.getInstance()
    configuration.initialize('/first-worker.js')
    configuration.dispose()
    configuration.initialize('/next-worker.js')
    expect(mockRendererInstances).toHaveLength(2)
    expect(mockRendererInstances[0].destroy).toHaveBeenCalledTimes(1)
    configuration.dispose()
  })

  it.each([false, true])(
    'observes background configuration failures and reports only active scopes (disposed=%s)',
    async disposed => {
      const configuration = AcTrMTextRenderer.getInstance()
      configuration.setWorkerUrl('/mtext-worker.js')
      const scope = configuration.createScope(new AcTrStyleManager())
      scope.initialize()
      let fail!: (error: Error) => void
      mockRendererInstances[0].setFontUrl.mockImplementation(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject
          })
      )
      const warning = jest.spyOn(log, 'warn').mockImplementation(() => {})
      try {
        scope.setFontUrl('/fonts/')
        if (disposed) scope.dispose()
        fail(new Error('Worker request failed'))
        await Promise.resolve()
        await Promise.resolve()
        if (disposed) expect(warning).not.toHaveBeenCalled()
        else
          expect(warning).toHaveBeenCalledWith(
            'Failed to configure text renderer: Error: Worker request failed'
          )
      } finally {
        warning.mockRestore()
        scope.dispose()
      }
    }
  )

  it('creates lazy isolated text pipelines without replacing host materials', async () => {
    const host = AcTrMTextRenderer.getInstance()
    host.setRenderMode('main')
    host.setFontUrl('https://cdn.example.com/fonts/')
    host.overrideStyleManager(new AcTrStyleManager())
    host.initialize()
    const original = mockRendererInstances[0]

    const first = host.createScope(new AcTrStyleManager())
    const second = host.createScope(new AcTrStyleManager())
    expect(mockRendererInstances).toHaveLength(1)
    await first.loadFonts(['txt.shx'])
    await second.loadFonts(['txt.shx'])
    expect(mockRendererInstances).toHaveLength(3)
    expect(original.setStyleManager).toHaveBeenCalledTimes(1)
    expect(mockRendererInstances[1].setFontUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/fonts/'
    )
    expect(mockRendererInstances[1].setStyleManager.mock.calls[0][0]).not.toBe(
      mockRendererInstances[2].setStyleManager.mock.calls[0][0]
    )
    first.dispose()
    expect(mockRendererInstances[1].destroy).toHaveBeenCalledTimes(1)
    expect(original.destroy).not.toHaveBeenCalled()
    expect(mockRendererInstances[2].destroy).not.toHaveBeenCalled()
    second.dispose()
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
    expect(renderer.getRenderMode()).toBe('worker')
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

  it('skips loadFonts for faces already synced into the renderer session', async () => {
    const renderer = AcTrMTextRenderer.getInstance()
    renderer.initialize('./assets/mtext-renderer-worker.js')

    const first = await renderer.loadFonts(['simsun', 'hztxt'], {
      scope: 'one'
    })
    expect(first).toEqual(['simsun', 'hztxt'])
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledTimes(1)
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledWith(
      ['simsun', 'hztxt'],
      { scope: 'one' }
    )

    mockRendererInstances[0].loadFonts.mockClear()
    const second = await renderer.loadFonts(['SimSun.ttf', 'amgdt'])
    expect(second).toEqual(['amgdt'])
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledTimes(1)
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledWith(
      ['amgdt'],
      undefined
    )
    expect(renderer.getRendererLoadedFontCount()).toBe(3)
  })
})
