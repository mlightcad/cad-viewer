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
 * CAD text renderer facade. The application singleton supplies font setup;
 * drawing scopes own independent material reconstruction and worker state.
 */
export class AcTrMTextRenderer {
  private static _instance: AcTrMTextRenderer | null = null
  private _workerUrl?: string | URL
  private _renderer?: UnifiedRenderer
  private _fontUrl?: string
  private _renderMode?: RenderMode
  private _styleManager?: AcTrStyleManager
  private _defaultFonts?: DefaultFontsPreset | string | readonly string[]
  private _lazyFontLoading?: boolean
  private _awaitFontsBeforeDraw?: boolean
  private _configurationSource?: AcTrMTextRenderer
  private _isScope = false
  private _disposed = false
  private _defaultFontsReady?: Promise<void>
  private _finishDefaultFontsReady?: () => void
  /**
   * Fonts successfully pushed into the active worker pool (or main renderer)
   * via {@link loadFonts}. Cleared when the unified renderer is destroyed.
   */
  private _rendererLoadedFonts = new Set<string>()

  private constructor() {
    // Do nothing for now
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
   * Creates an independently disposable text/material pipeline using this
   * renderer's font configuration. Font files remain shared through the font
   * manager; worker state and reconstructed materials belong to the new scope.
   */
  createScope(styleManager: AcTrStyleManager): AcTrMTextRenderer {
    this.assertActive()
    const scope = new AcTrMTextRenderer()
    scope._isScope = true
    scope._configurationSource = this
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
    this._styleManager = value
    // Apply immediately when the unified renderer already exists (e.g. re-init
    // or late override). Otherwise reconstruct would keep DefaultStyleManager
    // materials without `isForeground` tracking.
    if (this._renderer) {
      const styleManager = new AcTrMTextStyleManager(value)
      this._renderer.setStyleManager(styleManager)
    }
  }

  /** Configures the next initialization without allocating a worker pool. */
  setWorkerUrl(value: string | URL): void {
    this.inheritConfiguration()
    this._workerUrl = value
  }

  /**
   * Set URL to load fonts
   * @param value - URL to load fonts
   */
  setFontUrl(value: string) {
    this.inheritConfiguration()
    this._fontUrl = value
    this.observeConfiguration(this.applyFontUrl())
  }

  /**
   * Set render mode to use by mtext renderer
   * @param mode - Render mode
   */
  setRenderMode(mode: RenderMode) {
    this.inheritConfiguration()
    if (this._renderMode !== mode) this.resetDefaultFontsReady()
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
    this.inheritConfiguration()
    return this._renderMode ?? 'worker'
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
    this.inheritConfiguration()
    this.resetDefaultFontsReady()
    this._defaultFonts = fonts
    await this.applyDefaultFonts()
  }

  /**
   * Mirrors {@link FontManager.lazyFontLoading} onto the main thread and worker pool.
   */
  async setLazyFontLoading(enabled: boolean): Promise<void> {
    this.inheritConfiguration()
    this._lazyFontLoading = enabled
    FontManager.instance.lazyFontLoading = enabled
    await this.applyLazyFontLoading()
  }

  /**
   * When true with lazy loading, {@link asyncRenderMText} / {@link asyncRenderShape}
   * wait for referenced fonts before building glyph geometry.
   */
  async setAwaitFontsBeforeDraw(enabled: boolean): Promise<void> {
    this.inheritConfiguration()
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
   * @returns Names that were actually sent to the renderer this call.
   */
  async loadFonts(
    fonts: readonly string[],
    options?: { scope?: 'one' | 'all' }
  ): Promise<string[]> {
    this.ensureRendererCreated()
    if (!this._renderer || fonts.length === 0) {
      return []
    }
    const pending = fonts.filter(name => {
      const key = normalizeRendererFontKey(name)
      return !!key && !this._rendererLoadedFonts.has(key)
    })
    if (pending.length === 0) {
      return []
    }
    const renderer = this._renderer
    await renderer.loadFonts(pending, options)
    if (this._disposed || this._renderer !== renderer) return []
    for (const name of pending) {
      const key = normalizeRendererFontKey(name)
      if (key) {
        this._rendererLoadedFonts.add(key)
      }
    }
    return pending
  }

  /**
   * Warms fallback fonts in this drawing's rendering pipeline, once per scope.
   * Worker mode avoids parsing faces on the main thread. The existing open-time
   * 30s deadline still permits fallback output if font loading stalls or fails.
   * Disposal ends the wait; callers must check their scene/context lifetime.
   */
  ensureDefaultFontsReady(): Promise<void> {
    this.inheritConfiguration()
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
    return this._rendererLoadedFonts.size
  }

  /**
   * Replaces session-scoped missed-font bookkeeping on the main thread and workers.
   */
  async replaceMissedFonts(fonts: Record<string, number>): Promise<void> {
    this.assertActive()
    if (this._renderer) {
      await this._renderer.replaceMissedFonts(fonts)
      return
    }
    FontManager.instance.replaceMissedFonts(fonts)
  }

  /** Clears session-scoped missed-font bookkeeping on the main thread and workers. */
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
    const renderer = await this.readyRenderer()
    return renderer.asyncRenderMText(mtextContent, textStyle, colorSettings)
  }

  /**
   * Render MText using the current mode synchronously
   */
  syncRenderMText(
    mtextContent: MTextData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): MTextObject {
    this.ensureRendererCreated()
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    const mtext = this._renderer.syncRenderMText(
      mtextContent,
      textStyle,
      colorSettings
    )
    return mtext
  }

  async asyncRenderShape(
    shapeContent: ShapeData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): Promise<MTextObject> {
    const renderer = await this.readyRenderer()
    return renderer.asyncRenderShape(shapeContent, textStyle, colorSettings)
  }

  syncRenderShape(
    shapeContent: ShapeData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): MTextObject {
    this.ensureRendererCreated()
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    return this._renderer.syncRenderShape(
      shapeContent,
      textStyle,
      colorSettings
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
    this.inheritConfiguration()
    this.resetDefaultFontsReady()
    if (workerUrl !== undefined) {
      this._workerUrl = workerUrl
    }

    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    this._rendererLoadedFonts.clear()

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
    if (this._styleManager) {
      const styleManager = new AcTrMTextStyleManager(this._styleManager)
      this._renderer.setStyleManager(styleManager)
    }
  }

  /**
   * Estimates memory used by mtext-renderer (loaded fonts, caches, workers).
   *
   * Prefers {@link UnifiedRenderer.estimateMemoryUsage} when the renderer is
   * initialized; otherwise falls back to the main-thread {@link FontManager}.
   */
  async estimateMemoryUsage(): Promise<MemoryUsageReport> {
    this.assertActive()
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
   * Dispose of the renderer and reset cached configuration.
   */
  dispose(): void {
    if (this._isScope) this._disposed = true
    this.resetDefaultFontsReady()
    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    this._rendererLoadedFonts.clear()
    this._workerUrl = undefined
    this._renderMode = undefined
    this._defaultFonts = undefined
    this._lazyFontLoading = undefined
    this._awaitFontsBeforeDraw = undefined
    this._configurationSource = undefined
    this._styleManager = undefined
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
    this.assertActive()
    if (!this._renderer) this.inheritConfiguration()
    if (!this._renderer && (this._workerUrl || this._renderMode === 'main')) {
      this.initialize(this._workerUrl)
    }
  }

  private async readyRenderer(): Promise<UnifiedRenderer> {
    this.ensureRendererCreated()
    const renderer = this._renderer
    if (!renderer) throw new Error('AcTrMTextRenderer not initialized!')
    await this.ensureDefaultFontsReady()
    this.assertActive()
    if (this._renderer !== renderer) {
      throw new Error('Text rendering pipeline was replaced')
    }
    return renderer
  }

  /** Configuration is resolved lazily after application/worker setup completes. */
  private inheritConfiguration(): void {
    this.assertActive()
    const source = this._configurationSource
    if (!source) return
    source.inheritConfiguration()
    this._workerUrl = source._workerUrl
    this._fontUrl = source._fontUrl
    this._renderMode = source._renderMode
    this._defaultFonts = source._defaultFonts
    this._lazyFontLoading = source._lazyFontLoading
    this._awaitFontsBeforeDraw = source._awaitFontsBeforeDraw
    this._configurationSource = undefined
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
