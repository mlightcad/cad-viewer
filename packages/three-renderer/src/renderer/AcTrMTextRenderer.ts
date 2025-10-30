import {
  ColorSettings,
  MTextData,
  MTextObject,
  TextStyle,
  UnifiedRenderer
} from '@mlightcad/mtext-renderer'

/**
 * Singleton class for managing MText rendering using WebWorkerRenderer
 */
export class AcTrMTextRenderer {
  private static _instance: AcTrMTextRenderer | null = null
  private _renderer?: UnifiedRenderer
  private _fontUrl?: string

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
   * Set URL to load fonts
   * @param value - URL to load fonts
   */
  setFontUrl(value: string) {
    if (this._renderer) {
      this._renderer.setFontUrl(value)
    } else {
      this._fontUrl = value
    }
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
      colorSettings,
      'worker'
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
  public initialize(workerUrl: string): void {
    this._renderer = new UnifiedRenderer('worker', { workerUrl })
    if (this._fontUrl) {
      this._renderer.setFontUrl(this._fontUrl)
    }
  }

  /**
   * Dispose of the renderer and reset the singleton
   */
  public dispose(): void {
    if (this._renderer) {
      this._renderer.destroy()
      this._renderer = undefined
    }
    AcTrMTextRenderer._instance = null
  }
}
