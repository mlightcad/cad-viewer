import {
  ColorSettings,
  MTextData,
  MTextObject,
  RenderMode,
  StyleManager,
  StyleTraits,
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

  getMeshBasicMaterial(traits: StyleTraits): THREE.Material {
    const entityTraits = AcTrSubEntityTraitsUtil.createTraitsForMText(traits)
    return this._styleManager.getFillMaterial(entityTraits)
  }

  getLineBasicMaterial(traits: StyleTraits): THREE.Material {
    const entityTraits = AcTrSubEntityTraitsUtil.createTraitsForMText(traits)
    return this._styleManager.getLineMaterial(entityTraits, true)
  }
}

/**
 * Singleton class for managing MText rendering using WebWorkerRenderer
 */
export class AcTrMTextRenderer {
  private static _instance: AcTrMTextRenderer | null = null
  private _workerUrl?: string
  private _renderer?: UnifiedRenderer
  private _fontUrl?: string
  private _renderMode?: RenderMode
  private _styleManager?: AcTrStyleManager

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
    if (this._renderer) {
      this._renderer.setFontUrl(value)
    }
    this._fontUrl = value
  }

  /**
   * Set render mode to use by mtext renderer
   * @param mode - Render mode
   */
  setRenderMode(mode: RenderMode) {
    if (this._renderer) {
      this._renderer.setDefaultMode(mode)
    }
    this._renderMode = mode
  }

  /**
   * Render MText using the current mode asynchronously
   */
  async asyncRenderMText(
    mtextContent: MTextData,
    textStyle: TextStyle,
    colorSettings: ColorSettings = {
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }
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
    colorSettings: ColorSettings = {
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }
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

  /**
   * Initialize the renderer with worker URL
   * @param workerUrl - URL to the worker script
   */
  initialize(workerUrl: string): void {
    this._workerUrl = workerUrl
    // Notes:
    // Please don't modify the default rendering mode from 'worker' to 'main'.
    // Otherwise, web worker renderer will not get 'setFontUrl' message. Call
    // to 'setFontUrl' in the following code will not take effect.
    this._renderer = new UnifiedRenderer('worker', { workerUrl })
    if (this._fontUrl) {
      this._renderer.setFontUrl(this._fontUrl)
    }
    if (this._renderMode) {
      this._renderer.setDefaultMode(this._renderMode)
    }
    if (this._styleManager) {
      const styleManager = new AcTrMTextStyleManager(this._styleManager)
      this._renderer.setStyleManager(styleManager)
    }
  }

  /**
   * Dispose of the renderer and reset the singleton
   */
  dispose(): void {
    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    // AcTrMTextRenderer._instance = null
  }

  private ensureRendererCreated() {
    if (!this._renderer && this._workerUrl) {
      this.initialize(this._workerUrl)
    }
  }
}
