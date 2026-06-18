import {
  ColorSettings,
  createDefaultColorSettings,
  DefaultFontsPreset,
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
    // Route MText glyph fills through the dedicated helper so their
    // linework-tier `drawOrder` semantics stay explicit even though
    // they are rasterized as meshes.
    return this._styleManager.getMTextFillMaterial(entityTraits)
  }

  getLineBasicMaterial(traits: ColorSettings): THREE.Material {
    const entityTraits = AcTrSubEntityTraitsUtil.createTraitsForMText(
      traits,
      this._styleManager.currentBackgroundColor
    )
    return this._styleManager.getLineMaterial(entityTraits, true)
  }
}

/**
 * Singleton class for managing MText rendering using WebWorkerRenderer
 */
export class AcTrMTextRenderer {
  private static _instance: AcTrMTextRenderer | null = null
  private _workerUrl?: string | URL
  private _renderer?: UnifiedRenderer
  private _fontUrl?: string
  private _renderMode?: RenderMode
  private _styleManager?: AcTrStyleManager
  private _defaultFonts?: DefaultFontsPreset | string | readonly string[]

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
   * Override text renderer's default style manager with cad-viewer's style manager so
   * that cad-viewer's style manager can manage materials used by texts too.
   * @param value - New style manager
   */
  overrideStyleManager(value: AcTrStyleManager) {
    this._styleManager = value
  }

  /**
   * Set URL to load fonts
   * @param value - URL to load fonts
   */
  setFontUrl(value: string) {
    this._fontUrl = value
    this.applyFontUrl()
  }

  /**
   * Set render mode to use by mtext renderer
   * @param mode - Render mode
   */
  setRenderMode(mode: RenderMode) {
    this._renderMode = mode
    if (this._renderer) {
      this._renderer.setDefaultMode(mode)
      this.applyFontUrl()
    }
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
    this._defaultFonts = fonts
    await this.applyDefaultFonts()
  }

  /**
   * Render MText using the current mode asynchronously
   */
  async asyncRenderMText(
    mtextContent: MTextData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = createDefaultColorSettings()
  ): Promise<MTextObject> {
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    const mtext = await this._renderer!.asyncRenderMText(
      mtextContent,
      textStyle,
      colorSettings
    )
    return mtext
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
    if (!this._renderer) {
      throw new Error('AcTrMTextRenderer not initialized!')
    }
    return this._renderer.asyncRenderShape(
      shapeContent,
      textStyle,
      colorSettings
    )
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

    this.applyFontUrl()
    void this.applyDefaultFonts()
    if (this._styleManager) {
      const styleManager = new AcTrMTextStyleManager(this._styleManager)
      this._renderer.setStyleManager(styleManager)
    }
  }

  /**
   * Dispose of the renderer and reset cached configuration.
   */
  dispose(): void {
    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    this._workerUrl = undefined
    this._renderMode = undefined
    this._defaultFonts = undefined
  }

  /**
   * Dispose and discard the singleton instance.
   */
  public static resetInstance(): void {
    AcTrMTextRenderer.getInstance().dispose()
    AcTrMTextRenderer._instance = null
  }

  private ensureRendererCreated() {
    if (!this._renderer && this._workerUrl) {
      this.initialize(this._workerUrl)
    }
  }

  private applyFontUrl() {
    if (this._renderer && this._fontUrl) {
      this._renderer.setFontUrl(this._fontUrl)
    }
  }

  private async applyDefaultFonts() {
    if (this._renderer && this._defaultFonts !== undefined) {
      await this._renderer.setDefaultFonts(this._defaultFonts)
    }
  }
}
