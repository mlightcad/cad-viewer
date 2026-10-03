const mockRendererInstances: Array<{
  setFontUrl: jest.Mock
  setDefaultMode: jest.Mock
  setDefaultFonts: jest.Mock
  setStyleManager: jest.Mock
  loadFonts: jest.Mock
  asyncRenderMText: jest.Mock
  asyncRenderShape: jest.Mock
  syncRenderMText: jest.Mock
  syncRenderShape: jest.Mock
  replaceMissedFonts: jest.Mock
  destroy: jest.Mock
}> = []

const mockUnifiedRenderer = jest.fn().mockImplementation(() => {
  const renderer = {
    setFontUrl: jest.fn(),
    setDefaultMode: jest.fn(),
    setDefaultFonts: jest.fn(() => Promise.resolve()),
    setStyleManager: jest.fn(),
    loadFonts: jest.fn((fonts: string[]) => Promise.resolve({ loaded: fonts })),
    asyncRenderMText: jest.fn(() => Promise.resolve({})),
    asyncRenderShape: jest.fn(() => Promise.resolve({})),
    syncRenderMText: jest.fn(() => ({})),
    syncRenderShape: jest.fn(() => ({})),
    replaceMissedFonts: jest.fn(() => Promise.resolve()),
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
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'

describe('AcTrMTextRenderer', () => {
  afterEach(() => {
    AcTrMTextRenderer.resetInstance()
  })
  beforeEach(() => {
    ;(AcTrMTextRenderer as unknown as { _instance: unknown })._instance = null
    mockRendererInstances.length = 0
    mockUnifiedRenderer.mockClear()
    mockFontManager.getFontsToLoad.mockClear()
    mockFontManager.requestFonts.mockClear()
  })

  it('allocates one shared pipeline and one preset warmup for multiple drawings', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.setWorkerUrl('/mtext-worker.js')
    const first = owner.createScope(new AcTrStyleManager())
    const second = owner.createScope(new AcTrStyleManager())
    expect(mockRendererInstances).toHaveLength(0)
    await Promise.all([
      first.ensureDefaultFontsReady(),
      second.ensureDefaultFontsReady()
    ])
    expect(mockRendererInstances).toHaveLength(1)
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledTimes(1)
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledWith(
      ['txt', 'symbol'],
      { scope: 'all' }
    )
    expect(mockFontManager.requestFonts).not.toHaveBeenCalled()
    first.dispose()
    second.dispose()
    expect(mockRendererInstances[0].destroy).not.toHaveBeenCalled()
    owner.dispose()
    expect(mockRendererInstances[0].destroy).toHaveBeenCalledTimes(1)
  })

  it('gives default contexts independent material and cancellation ownership', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.setWorkerUrl('/worker.js')
    const first = new AcTrRenderContext()
    const second = new AcTrRenderContext()
    await Promise.all([
      first.mtextRenderer.asyncRenderMText({} as never, {} as never),
      second.mtextRenderer.asyncRenderMText({} as never, {} as never)
    ])
    expect(mockRendererInstances).toHaveLength(1)
    const native = mockRendererInstances[0]
    const optionsA = native.asyncRenderMText.mock.calls[0][4]
    const optionsB = native.asyncRenderMText.mock.calls[1][4]
    expect(optionsA.styleManager).not.toBe(optionsB.styleManager)
    first.dispose()
    expect(optionsA.signal.aborted).toBe(true)
    expect(optionsB.signal.aborted).toBe(false)
    expect(native.destroy).not.toHaveBeenCalled()
    await second.mtextRenderer.asyncRenderMText({} as never, {} as never)
    second.dispose()
    first.styleManager.dispose()
    second.styleManager.dispose()
  })

  it('warms shared main-thread fonts without allocating workers', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.setRenderMode('main')
    const first = owner.createScope(new AcTrStyleManager())
    const second = owner.createScope(new AcTrStyleManager())
    await Promise.all([
      first.ensureDefaultFontsReady(),
      second.ensureDefaultFontsReady()
    ])
    expect(mockFontManager.requestFonts).toHaveBeenCalledTimes(1)
    expect(mockRendererInstances).toHaveLength(0)
    await first.asyncRenderMText({} as never, {} as never)
    expect(mockFontManager.requestFonts).toHaveBeenCalledTimes(1)
    expect(mockUnifiedRenderer).toHaveBeenCalledWith('main', {})
  })

  it.each(['asyncRenderMText', 'asyncRenderShape'] as const)(
    '%s captures different source materials without changing the shared default manager',
    async method => {
      const owner = AcTrMTextRenderer.getInstance()
      owner.setWorkerUrl('/mtext-worker.js')
      const firstStyles = new AcTrStyleManager()
      const secondStyles = new AcTrStyleManager()
      const first = owner.createScope(firstStyles)
      const second = owner.createScope(secondStyles)
      await Promise.all([
        first[method]({} as never, {} as never),
        second[method]({} as never, {} as never)
      ])
      expect(mockRendererInstances).toHaveLength(1)
      const native = mockRendererInstances[0]
      const a = native[method].mock.calls[0][4]
      const b = native[method].mock.calls[1][4]
      expect(a.styleManager).not.toBe(b.styleManager)
      const color = {
        color: { aci: 256 },
        layer: 'SHARED',
        byLayerColor: 0xff0000,
        byBlockColor: 0xffffff
      }
      const materialA = a.styleManager.getMeshBasicMaterial(color)
      const materialB = b.styleManager.getMeshBasicMaterial(color)
      expect(materialA).not.toBe(materialB)
      const disposedB = jest.spyOn(materialB, 'dispose')
      first.dispose()
      firstStyles.dispose()
      expect(a.signal.aborted).toBe(true)
      expect(b.signal.aborted).toBe(false)
      expect(disposedB).not.toHaveBeenCalled()
      expect(native.destroy).not.toHaveBeenCalled()
      expect(native.setStyleManager).not.toHaveBeenCalled()
      await second[method]({} as never, {} as never)
      expect(native[method].mock.calls[2][4].styleManager).toBe(b.styleManager)
      secondStyles.dispose()
    }
  )

  it.each(['syncRenderMText', 'syncRenderShape'] as const)(
    '%s supplies source materials and cancellation through native request options',
    method => {
      const owner = AcTrMTextRenderer.getInstance()
      owner.setRenderMode('main')
      const source = owner.createScope(new AcTrStyleManager())
      source[method]({} as never, {} as never)
      const options = mockRendererInstances[0][method].mock.calls[0][3]
      expect(options.styleManager).toBeDefined()
      expect(options.signal.aborted).toBe(false)
      source.dispose()
      expect(options.signal.aborted).toBe(true)
      expect(mockRendererInstances[0].destroy).not.toHaveBeenCalled()
    }
  )

  it.each(['asyncRenderMText', 'asyncRenderShape'] as const)(
    '%s cancels one drawing during shared preload while another continues',
    async method => {
      const owner = AcTrMTextRenderer.getInstance()
      owner.initialize('/mtext-worker.js')
      const first = owner.createScope(new AcTrStyleManager())
      const second = owner.createScope(new AcTrStyleManager())
      let finish!: (value: { loaded: string[] }) => void
      const native = mockRendererInstances[0]
      native.loadFonts.mockImplementation(
        () =>
          new Promise(resolve => {
            finish = resolve
          })
      )
      const abandoned = first[method]({} as never, {} as never)
      const continuing = second[method]({} as never, {} as never)
      first.dispose()
      await expect(abandoned).rejects.toMatchObject({ name: 'AbortError' })
      expect(native[method]).not.toHaveBeenCalled()
      finish({ loaded: ['txt', 'symbol'] })
      await continuing
      expect(native[method]).toHaveBeenCalledTimes(1)
      expect(native.loadFonts).toHaveBeenCalledTimes(1)
      expect(native.destroy).not.toHaveBeenCalled()
      await expect(first.loadFonts(['late'])).rejects.toThrow('disposed')
    }
  )

  it('cancels obsolete requests when the owner replaces the shared engine', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.initialize('/mtext-worker.js')
    const source = owner.createScope(new AcTrStyleManager())
    mockRendererInstances[0].loadFonts.mockReturnValue(new Promise(() => {}))
    const obsolete = source.asyncRenderMText({} as never, {} as never)
    owner.initialize()
    await expect(obsolete).rejects.toMatchObject({ name: 'AbortError' })
    expect(mockRendererInstances[0].asyncRenderMText).not.toHaveBeenCalled()
    await source.asyncRenderMText({} as never, {} as never)
    expect(mockRendererInstances[1].asyncRenderMText).toHaveBeenCalledTimes(1)
  })

  it('allows only the owner to configure computation and shared diagnostics', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    const source = owner.createScope(new AcTrStyleManager())
    expect(() => source.initialize('/worker.js')).toThrow('application owner')
    expect(() => source.setWorkerUrl('/worker.js')).toThrow('application owner')
    expect(() => source.setFontUrl('/fonts/')).toThrow('application owner')
    expect(() => source.setRenderMode('main')).toThrow('application owner')
    await expect(source.setDefaultFonts('modern')).rejects.toThrow(
      'application owner'
    )
    await expect(source.setLazyFontLoading(true)).rejects.toThrow(
      'application owner'
    )
    await expect(source.setAwaitFontsBeforeDraw(true)).rejects.toThrow(
      'application owner'
    )
    await expect(source.clearMissedFonts()).rejects.toThrow('application owner')
    expect(mockRendererInstances).toHaveLength(0)
  })

  it('retains the fallback deadline and clears its timer only with the shared owner', async () => {
    jest.useFakeTimers()
    try {
      const owner = AcTrMTextRenderer.getInstance()
      owner.initialize('/worker.js')
      const source = owner.createScope(new AcTrStyleManager())
      mockRendererInstances[0].loadFonts.mockReturnValue(new Promise(() => {}))
      const ownerReady = owner.ensureDefaultFontsReady()
      const sourceReady = source.ensureDefaultFontsReady()
      source.dispose()
      await expect(sourceReady).resolves.toBeUndefined()
      expect(jest.getTimerCount()).toBe(1)
      const settled = jest.fn()
      void ownerReady.then(settled)
      jest.advanceTimersByTime(29_999)
      await Promise.resolve()
      expect(settled).not.toHaveBeenCalled()
      jest.advanceTimersByTime(1)
      await ownerReady
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      AcTrMTextRenderer.getInstance().dispose()
      jest.useRealTimers()
    }
  })

  it('keeps late font completions out of a replaced owner engine', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.initialize('/worker.js')
    let finish!: (value: { loaded: string[] }) => void
    mockRendererInstances[0].loadFonts.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const loading = owner.loadFonts(['old'])
    owner.initialize()
    finish({ loaded: ['old'] })
    expect(await loading).toEqual([])
    expect(owner.getRendererLoadedFontCount()).toBe(0)
  })

  it('records confirmed fonts only and retries failed names', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.initialize('/worker.js')
    const native = mockRendererInstances[0]
    native.loadFonts.mockResolvedValueOnce({ loaded: ['good'] })
    expect(await owner.loadFonts(['good', 'missing'])).toEqual(['good'])
    expect(owner.getRendererLoadedFontCount()).toBe(1)
    expect(await owner.loadFonts(['good', 'missing'])).toEqual(['missing'])
    expect(native.loadFonts.mock.calls[1][0]).toEqual(['missing'])
  })

  it('deduplicates concurrent loads and retains requested coverage if caller options change', async () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.initialize('/worker.js')
    const native = mockRendererInstances[0]
    let finish!: (value: { loaded: string[] }) => void
    native.loadFonts.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const one = owner.loadFonts(['txt'], { scope: 'one' })
    const same = owner.loadFonts(['TXT.shx'], { scope: 'one' })
    const allOptions: { scope: 'one' | 'all' } = { scope: 'all' }
    const all = owner.loadFonts(['txt'], allOptions)
    allOptions.scope = 'one'
    const sameAll = owner.loadFonts(['TXT.shx'], { scope: 'all' })
    expect(native.loadFonts).toHaveBeenCalledTimes(1)
    finish({ loaded: ['txt'] })
    expect(await one).toEqual(['txt'])
    expect(await same).toEqual(['TXT.shx'])
    expect(await all).toEqual(['txt'])
    expect(await sameAll).toEqual(['TXT.shx'])
    expect(native.loadFonts).toHaveBeenCalledTimes(2)
    expect(native.loadFonts.mock.calls[1]).toEqual([['txt'], { scope: 'all' }])
    expect(await owner.loadFonts(['txt'], { scope: 'one' })).toEqual([])
    expect(await owner.loadFonts(['txt'], { scope: 'all' })).toEqual([])
  })

  it('allows the application owner to be explicitly reinitialized after disposal', () => {
    const owner = AcTrMTextRenderer.getInstance()
    owner.initialize('/first-worker.js')
    const source = owner.createScope(new AcTrStyleManager())
    owner.dispose()
    expect(() => source.syncRenderMText({} as never, {} as never)).toThrow(
      'disposed'
    )
    owner.initialize('/next-worker.js')
    expect(mockRendererInstances).toHaveLength(2)
    expect(mockRendererInstances[0].destroy).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])(
    'observes background config failures and reports only the live engine (disposed=%s)',
    async disposed => {
      const owner = AcTrMTextRenderer.getInstance()
      owner.initialize('/worker.js')
      let fail!: (error: Error) => void
      mockRendererInstances[0].setFontUrl.mockImplementation(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject
          })
      )
      const warning = jest.spyOn(log, 'warn').mockImplementation(() => {})
      try {
        owner.setFontUrl('/fonts/')
        if (disposed) owner.dispose()
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
      }
    }
  )

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
    expect(mockRendererInstances[0].loadFonts).toHaveBeenCalledWith(['amgdt'], {
      scope: 'one'
    })
    expect(renderer.getRendererLoadedFontCount()).toBe(3)
  })
})
