import { AcCmColor, log } from '@mlightcad/data-model'
import {
  ColorSettings,
  createDefaultColorSettings,
  DefaultFontsPreset,
  FontManager,
  type MemoryUsageReport,
  MTextData,
  MTextObject,
  RenderMode,
  ShapeData,
  StyleManager,
  TextRenderOptions,
  TextStyle,
  UnifiedRenderer
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../util'

class AcTrMTextStyleManager implements StyleManager {
  public unsupportedTextStyles: Record<string, number> = {}
  private _styleManager: AcTrStyleManager

  constructor(styeManager: AcTrStyleManager) {
    this._styleManager = styeManager
  }

  getMeshBasicMaterial(traits: ColorSettings): THREE.Material {
    const entityTraits = AcTrSubEntityTraitsUtil.createTraitsForMText(
      traits,
      this._styleManager.currentBackgroundColor
    )
    const { layerColor, layerColorRgb } = this.resolveLayerSwatch(traits)
    // Route MText glyph fills through the dedicated helper so their
    // linework-tier `drawOrder` semantics stay explicit even though
    // they are rasterized as meshes.
    return this._styleManager.getMTextFillMaterial(
      entityTraits,
      undefined,
      layerColor,
      layerColorRgb
    )
  }

  getLineBasicMaterial(traits: ColorSettings): THREE.Material {
    const entityTraits = AcTrSubEntityTraitsUtil.createTraitsForMText(
      traits,
      this._styleManager.currentBackgroundColor
    )
    const { layerColor, layerColorRgb } = this.resolveLayerSwatch(traits)
    return this._styleManager.getLineMaterial(
      entityTraits,
      true,
      undefined,
      layerColor,
      layerColorRgb
    )
  }

  /**
   * Inline `\C256` / entity ByLayer carry the resolved layer swatch on
   * {@link ColorSettings.byLayerColor}. Pass it into material *creation*
   * so ByLayer glyphs are not born white — never mutate a shared cached
   * material after the fact (that recolours unrelated glyphs).
   */
  private resolveLayerSwatch(traits: ColorSettings): {
    layerColor?: AcCmColor
    layerColorRgb?: number
  } {
    if (traits.color.aci !== 256) {
      return {}
    }
    const rgb = traits.byLayerColor
    if (typeof rgb !== 'number') {
      return {}
    }
    return {
      layerColor: new AcCmColor().setRGBValue(rgb),
      layerColorRgb: rgb
    }
  }
}

/**
 * CAD text renderer facade. The application owns one font/computation pipeline;
 * drawing scopes own material reconstruction and cancellation only.
 */
export class AcTrMTextRenderer {
  private static _instance: AcTrMTextRenderer | null = null
  private _workerUrl?: string | URL
  private _renderer?: UnifiedRenderer
  private _fontUrl?: string
  private _renderMode?: RenderMode
  private _materialAdapter?: AcTrMTextStyleManager
  private _defaultFonts?: DefaultFontsPreset | string | readonly string[]
  private _lazyFontLoading?: boolean
  private _awaitFontsBeforeDraw?: boolean
  private readonly _owner?: AcTrMTextRenderer
  private readonly _scopes = new Set<AcTrMTextRenderer>()
  private _requests = new AbortController()
  private _disposed = false
  private _defaultFontsReady?: Promise<void>
  private _finishDefaultFontsReady?: () => void
  /**
   * Fonts successfully pushed into the active worker pool (or main renderer)
   * via {@link loadFonts}. Cleared when the unified renderer is destroyed.
   */
  private _rendererLoadedFonts = new Map<string, 'one' | 'all'>()
  private _fontLoads = new Map<string, Promise<boolean>>()
  private _fontLoadGeneration = 0

  private constructor(owner?: AcTrMTextRenderer) {
    this._owner = owner
  }

  /**
   * Get the singleton instance of AcTrMTextRenderer
   */
  public static getInstance(): AcTrMTextRenderer {
    if (!AcTrMTextRenderer._instance) {
      AcTrMTextRenderer._instance = new AcTrMTextRenderer()
    }
    return AcTrMTextRenderer._instance
  }

  /**
   * Creates a material/cancellation scope that borrows the application's font
   * computation pipeline. Closing a drawing never destroys the shared workers.
   */
  createScope(styleManager: AcTrStyleManager): AcTrMTextRenderer {
    this.assertActive()
    const owner = this._owner ?? this
    const scope = new AcTrMTextRenderer(owner)
    owner._scopes.add(scope)
    scope.overrideStyleManager(styleManager)
    return scope
  }

  /**
   * Override text renderer's default style manager with cad-viewer's style manager so
   * that cad-viewer's style manager can manage materials used by texts too.
   * @param value - New style manager
   */
  overrideStyleManager(value: AcTrStyleManager) {
    this.assertActive()
    this._materialAdapter = new AcTrMTextStyleManager(value)
  }

  /** Configures the next initialization without allocating a worker pool. */
  setWorkerUrl(value: string | URL): void {
    this.assertOwner()
    this._workerUrl = value
  }

  /**
   * Set URL to load fonts
   * @param value - URL to load fonts
   */
  setFontUrl(value: string) {
    this.assertOwner()
    this._fontUrl = value
    this.observeConfiguration(this.applyFontUrl())
  }

  /**
   * Set render mode to use by mtext renderer
   * @param mode - Render mode
   */
  setRenderMode(mode: RenderMode) {
    this.assertOwner()
    if (this._renderMode !== mode) {
      this.resetDefaultFontsReady()
      this.resetFontLoads()
    }
    this._renderMode = mode
    if (this._renderer) {
      this._renderer.setDefaultMode(mode)
      this.observeConfiguration(this.applyFontUrl())
    }
  }

  /**
   * Current MText render mode (`worker` by default until {@link setRenderMode}).
   */
  getRenderMode(): RenderMode {
    this.assertActive()
    return this._owner?.getRenderMode() ?? this._renderMode ?? 'worker'
  }

  /**
   * Sets the default text and symbol font fallback chains on the active renderer
   * and syncs them to Web Workers.
   *
   * @param fonts - A preset name, a single font name, or an ordered list of font names
   */
  async setDefaultFonts(
    fonts: DefaultFontsPreset | string | readonly string[]
  ): Promise<void> {
    this.assertOwner()
    this.resetDefaultFontsReady()
    this._defaultFonts = fonts
    await this.applyDefaultFonts()
  }

  /**
   * Mirrors {@link FontManager.lazyFontLoading} onto the main thread and worker pool.
   */
  async setLazyFontLoading(enabled: boolean): Promise<void> {
    this.assertOwner()
    this._lazyFontLoading = enabled
    FontManager.instance.lazyFontLoading = enabled
    await this.applyLazyFontLoading()
  }

  /**
   * When true with lazy loading, {@link asyncRenderMText} / {@link asyncRenderShape}
   * wait for referenced fonts before building glyph geometry.
   */
  async setAwaitFontsBeforeDraw(enabled: boolean): Promise<void> {
    this.assertOwner()
    this._awaitFontsBeforeDraw = enabled
    FontManager.instance.awaitFontsBeforeDraw = enabled
    await this.applyAwaitFontsBeforeDraw()
  }

  /**
   * Loads fonts into the active renderer (main thread and/or worker pool).
   *
   * Skips faces already synced into this renderer session so open-time
   * preload (and later background fallback loads) do not re-parse large mesh
   * fonts into every worker.
   *
   * Use for style faces and for fallback faces that
   * {@link FontManager.awaitFontsBeforeDraw} only requests in the background —
   * e.g. {@link FontManager.getFontsToLoad} — so glyph draw does not bake
   * permanent '?' placeholders.
   *
   * @returns Newly requested faces confirmed loaded at the requested coverage.
   */
  async loadFonts(
    fonts: readonly string[],
    options?: { scope?: 'one' | 'all' }
  ): Promise<string[]> {
    this.assertActive()
    if (this._owner) return this._owner.loadFonts(fonts, options)
    this.ensureRendererCreated()
    if (!this._renderer || fonts.length === 0) {
      return []
    }
    const renderer = this._renderer
    const generation = this._fontLoadGeneration
    const coverage =
      this.getRenderMode() === 'main' ? 'all' : (options?.scope ?? 'one')
    const requested = new Map<string, string>()
    const waiting = new Map<string, Promise<boolean>>()
    const pending = new Map<string, string>()
    const prerequisites: Promise<boolean>[] = []
    for (const name of fonts) {
      const key = normalizeRendererFontKey(name)
      const loaded = this._rendererLoadedFonts.get(key)
      if (!key || loaded === 'all' || loaded === coverage || requested.has(key))
        continue
      requested.set(key, name)
      const existing =
        this._fontLoads.get(`all:${key}`) ??
        this._fontLoads.get(`${coverage}:${key}`)
      if (existing) waiting.set(key, existing)
      else {
        pending.set(key, name)
        // An all-worker upgrade follows an already running one-worker warmup.
        const warmingOne = this._fontLoads.get(`one:${key}`)
        if (coverage === 'all' && warmingOne) prerequisites.push(warmingOne)
      }
    }
    if (pending.size > 0) {
      const batch = (async () => {
        if (prerequisites.length) await Promise.allSettled(prerequisites)
        if (
          this._renderer !== renderer ||
          this._fontLoadGeneration !== generation
        )
          return new Set<string>()
        const result = await renderer.loadFonts([...pending.values()], {
          scope: coverage
        })
        const loaded = new Set<string>()
        if (
          this._renderer !== renderer ||
          this._fontLoadGeneration !== generation
        )
          return loaded
        for (const name of result.loaded) {
          const key = normalizeRendererFontKey(name)
          if (!pending.has(key)) continue
          loaded.add(key)
          if (this._rendererLoadedFonts.get(key) !== 'all')
            this._rendererLoadedFonts.set(key, coverage)
        }
        return loaded
      })()
      for (const key of pending.keys()) {
        const id = `${coverage}:${key}`
        const load = batch
          .then(loaded => loaded.has(key))
          .finally(() => {
            if (this._fontLoads.get(id) === load) this._fontLoads.delete(id)
          })
        this._fontLoads.set(id, load)
        waiting.set(key, load)
      }
    }
    const loaded = await Promise.all(
      [...waiting].map(async ([key, load]) =>
        (await load) ? requested.get(key)! : undefined
      )
    )
    return loaded.filter((name): name is string => name !== undefined)
  }

  /**
   * Warms fallback fonts once in the shared application pipeline.
   * Worker mode avoids parsing faces on the main thread. The existing open-time
   * 30s deadline still permits fallback output if font loading stalls or fails.
   * A drawing may stop waiting without cancelling font I/O needed by others.
   * Warmup settles on timeout, failure or source disposal; render requests use
   * their own abort-aware wait and never treat this promise as permission to draw.
   */
  ensureDefaultFontsReady(): Promise<void> {
    this.assertActive()
    if (this._owner) {
      const ready = this._owner.ensureDefaultFontsReady()
      const signal = this.requestOptions().signal!
      return waitForFonts(ready, signal).catch(error => {
        if (!signal.aborted) throw error
      })
    }
    if (this._defaultFontsReady) return this._defaultFontsReady
    const fonts = [...FontManager.instance.getFontsToLoad()]
    if (fonts.length === 0) {
      this._defaultFontsReady = Promise.resolve()
      return this._defaultFontsReady
    }
    const load =
      this.getRenderMode() === 'worker'
        ? this.loadFonts(fonts, { scope: 'all' })
        : FontManager.instance.requestFonts(fonts)
    this._defaultFontsReady = new Promise<void>(resolve => {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        if (this._finishDefaultFontsReady === finish) {
          this._finishDefaultFontsReady = undefined
        }
        resolve()
      }
      const timer = setTimeout(finish, 30_000)
      this._finishDefaultFontsReady = finish
      void load.then(finish, finish)
    })
    return this._defaultFontsReady
  }

  /**
   * Fonts already synced into the active renderer via {@link loadFonts}.
   * Useful for OPENPERF / diagnostics.
   */
  getRendererLoadedFontCount(): number {
    this.assertActive()
    return (
      this._owner?.getRendererLoadedFontCount() ??
      this._rendererLoadedFonts.size
    )
  }

  /**
   * Replaces the application's shared missed-font diagnostics. The native font
   * manager reports availability globally; this is not per-source attribution.
   */
  async replaceMissedFonts(fonts: Record<string, number>): Promise<void> {
    this.assertOwner()
    if (this._renderer) {
      await this._renderer.replaceMissedFonts(fonts)
      return
    }
    FontManager.instance.replaceMissedFonts(fonts)
  }

  /** Clears shared diagnostics without unloading fonts or cancelling source work. */
  async clearMissedFonts(): Promise<void> {
    await this.replaceMissedFonts({})
  }

  /**
   * Render MText using the current mode asynchronously
   */
  async asyncRenderMText(
    mtextContent: MTextData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): Promise<MTextObject> {
    const { renderer, options } = await this.readyRenderer()
    return renderer.asyncRenderMText(
      mtextContent,
      textStyle,
      colorSettings,
      undefined,
      options
    )
  }

  /**
   * Render MText using the current mode synchronously
   */
  syncRenderMText(
    mtextContent: MTextData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): MTextObject {
    const renderer = this.getRenderer()
    const mtext = renderer.syncRenderMText(
      mtextContent,
      textStyle,
      colorSettings,
      this.requestOptions()
    )
    return mtext
  }

  async asyncRenderShape(
    shapeContent: ShapeData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): Promise<MTextObject> {
    const { renderer, options } = await this.readyRenderer()
    return renderer.asyncRenderShape(
      shapeContent,
      textStyle,
      colorSettings,
      undefined,
      options
    )
  }

  syncRenderShape(
    shapeContent: ShapeData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): MTextObject {
    const renderer = this.getRenderer()
    return renderer.syncRenderShape(
      shapeContent,
      textStyle,
      colorSettings,
      this.requestOptions()
    )
  }

  /**
   * Initialize the renderer.
   *
   * When render mode is `main`, the unified renderer is created without
   * eagerly spawning web workers. The worker URL is still stored so worker
   * mode can be enabled later if needed.
   *
   * @param workerUrl - URL to the worker script used when render mode is `worker`
   */
  initialize(workerUrl?: string | URL): void {
    this.assertOwner()
    if (this._renderer || this._requests.signal.aborted) {
      this._requests.abort(
        new DOMException('Text rendering pipeline was replaced', 'AbortError')
      )
      this._requests = new AbortController()
      this.resetDefaultFontsReady()
      this.resetFontLoads()
    }
    if (workerUrl !== undefined) {
      this._workerUrl = workerUrl
    }

    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    const mode = this._renderMode ?? 'worker'
    const workerConfig = this._workerUrl ? { workerUrl: this._workerUrl } : {}

    if (mode === 'worker') {
      if (!this._workerUrl) {
        throw new Error(
          'AcTrMTextRenderer worker URL is required for worker render mode'
        )
      }
      this._renderer = new UnifiedRenderer('worker', workerConfig)
    } else {
      this._renderer = new UnifiedRenderer('main', workerConfig)
    }

    if (this._renderMode) {
      this._renderer.setDefaultMode(this._renderMode)
    }

    this.observeConfiguration(this.applyFontUrl())
    this.observeConfiguration(this.applyDefaultFonts())
    this.observeConfiguration(this.applyLazyFontLoading())
    this.observeConfiguration(this.applyAwaitFontsBeforeDraw())
  }

  /**
   * Estimates memory used by mtext-renderer (loaded fonts, caches, workers).
   *
   * Prefers {@link UnifiedRenderer.estimateMemoryUsage} when the renderer is
   * initialized; otherwise falls back to the main-thread {@link FontManager}.
   */
  async estimateMemoryUsage(): Promise<MemoryUsageReport> {
    this.assertActive()
    // All drawing scopes report this same shared owner; do not sum the reports.
    if (this._owner) return this._owner.estimateMemoryUsage()
    if (this._renderer) {
      return this._renderer.estimateMemoryUsage()
    }

    const mainThread = FontManager.instance.estimateMemoryUsage({ id: 'main' })
    return {
      collectedAt: Date.now(),
      totalEstimatedBytes: mainThread.totalEstimatedBytes,
      mainThread,
      workers: [],
      indexedDbFontCache: {
        fontCount: 0,
        totalBytes: 0,
        fonts: []
      }
    }
  }

  /**
   * A drawing releases only its material facade and outstanding requests.
   * Disposing the application owner closes all scopes and its worker pipeline.
   */
  dispose(): void {
    if (this._disposed) return
    this._requests.abort(
      new DOMException('Text rendering scope has been disposed', 'AbortError')
    )
    this._materialAdapter = undefined
    if (this._owner) {
      this._disposed = true
      this._owner._scopes.delete(this)
      return
    }
    for (const scope of this._scopes) scope.dispose()
    this._scopes.clear()
    this.resetDefaultFontsReady()
    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    this.resetFontLoads()
    this._workerUrl = undefined
    this._renderMode = undefined
    this._defaultFonts = undefined
    this._lazyFontLoading = undefined
    this._awaitFontsBeforeDraw = undefined
    this._fontUrl = undefined
  }

  /**
   * Dispose and discard the singleton instance.
   */
  public static resetInstance(): void {
    AcTrMTextRenderer.getInstance().dispose()
    AcTrMTextRenderer._instance = null
  }

  private ensureRendererCreated() {
    this.assertOwner()
    if (!this._renderer && (this._workerUrl || this._renderMode === 'main')) {
      this.initialize(this._workerUrl)
    }
  }

  private getRenderer(): UnifiedRenderer {
    this.assertActive()
    const owner = this._owner ?? this
    owner.ensureRendererCreated()
    const renderer = owner._renderer
    if (!renderer) throw new Error('AcTrMTextRenderer not initialized!')
    return renderer
  }

  private async readyRenderer(): Promise<{
    renderer: UnifiedRenderer
    options: TextRenderOptions
  }> {
    const renderer = this.getRenderer()
    const options = this.requestOptions()
    const owner = this._owner ?? this
    await waitForFonts(owner.ensureDefaultFontsReady(), options.signal!)
    this.assertActive()
    options.signal!.throwIfAborted()
    if (owner._renderer !== renderer) {
      throw new Error('Text rendering pipeline was replaced')
    }
    return { renderer, options }
  }

  private requestOptions(): TextRenderOptions {
    this.assertActive()
    return {
      styleManager: this._materialAdapter,
      signal: this._owner
        ? AbortSignal.any([this._requests.signal, this._owner._requests.signal])
        : this._requests.signal
    }
  }

  private assertOwner(): void {
    this.assertActive()
    if (this._owner)
      throw new Error(
        'Text computation must be configured through the application owner'
      )
  }

  private assertActive(): void {
    if (this._disposed)
      throw new Error('Text rendering scope has been disposed')
  }

  private resetDefaultFontsReady(): void {
    this._finishDefaultFontsReady?.()
    this._finishDefaultFontsReady = undefined
    this._defaultFontsReady = undefined
  }

  private resetFontLoads(): void {
    this._fontLoadGeneration++
    this._rendererLoadedFonts.clear()
    this._fontLoads.clear()
  }

  /** Worker shutdown rejects pending configuration as well as render requests. */
  private observeConfiguration(work: Promise<void>): void {
    const renderer = this._renderer
    void work.catch(error => {
      if (this._disposed || this._renderer !== renderer) return
      log.warn(`Failed to configure text renderer: ${error}`)
    })
  }

  private async applyFontUrl() {
    if (this._renderer && this._fontUrl) {
      await this._renderer.setFontUrl(this._fontUrl)
    }
  }

  private async applyDefaultFonts() {
    if (this._renderer && this._defaultFonts !== undefined) {
      await this._renderer.setDefaultFonts(this._defaultFonts)
    }
  }

  private async applyLazyFontLoading() {
    if (this._renderer && this._lazyFontLoading !== undefined) {
      await this._renderer.setLazyFontLoading(this._lazyFontLoading)
    }
  }

  private async applyAwaitFontsBeforeDraw() {
    if (this._renderer && this._awaitFontsBeforeDraw !== undefined) {
      await this._renderer.setAwaitFontsBeforeDraw(this._awaitFontsBeforeDraw)
    }
  }
}

/** A drawing can cancel its wait without cancelling shared font loading. */
function waitForFonts(
  ready: Promise<void>,
  signal: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const abort = () => reject(signal.reason)
    if (signal.aborted) {
      abort()
      return
    }
    signal.addEventListener('abort', abort, { once: true })
    ready.then(
      () => {
        signal.removeEventListener('abort', abort)
        resolve()
      },
      error => {
        signal.removeEventListener('abort', abort)
        reject(error)
      }
    )
  })
}

function normalizeRendererFontKey(fontName: string): string {
  if (fontName == null) return ''
  let name = String(fontName).trim()
  if (!name) return ''
  const dotIndex = name.lastIndexOf('.')
  if (
    dotIndex > 0 &&
    (dotIndex === name.length - 4 || dotIndex === name.length - 5)
  ) {
    name = name.substring(0, dotIndex)
  }
  return name.toLowerCase()
}
