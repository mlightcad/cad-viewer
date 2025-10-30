import { AcDbFontInfo, AcDbFontLoader } from '@mlightcad/data-model'
import { AcTrFontLoader } from '@mlightcad/three-renderer'

import { AcEdFontNotLoadedInfo, eventBus } from '../editor'

/**
 * Font loader implementation for CAD text rendering.
 *
 * This class implements the {@link AcDbFontLoader} interface and provides functionality to:
 * - Fetch available font metadata from a CDN
 * - Load required fonts for CAD text rendering
 * - Handle font loading errors and emit appropriate events
 * - Manage font availability checking
 *
 * The font loader works with a Three.js renderer to load fonts that are used
 * for rendering CAD text entities like MText and Text.
 *
 * @example
 * ```typescript
 * const renderer = new AcTrRenderer();
 * const fontLoader = new AcApFontLoader(renderer);
 *
 * // Load specific fonts
 * await fontLoader.load(['Arial', 'SimSun']);
 *
 * // Get all available fonts
 * const fonts = await fontLoader.getAvaiableFonts();
 * console.log('Available fonts:', fonts);
 * ```
 */
export class AcApFontLoader implements AcDbFontLoader {
  /** Font loader in mtext-render */
  private _loader: AcTrFontLoader

  /**
   * Creates a new font loader instance.
   *
   * @param renderer - The Three.js renderer that will use the loaded fonts
   */
  constructor() {
    this._loader = new AcTrFontLoader()
  }

  /**
   * Base URL to load fonts
   */
  get baseUrl() {
    return this._loader.baseUrl
  }
  set baseUrl(value: string) {
    this._loader.baseUrl = value
  }

  /**
   * Avaiable fonts to load.
   */
  get avaiableFonts(): AcDbFontInfo[] {
    return this._loader.avaiableFonts
  }

  /**
   * @inheritdoc
   */
  async getAvaiableFonts(): Promise<AcDbFontInfo[]> {
    return await this._loader.getAvailableFonts()
  }

  /**
   * @inheritdoc
   */
  async load(fontNames: string[]) {
    const loadStatus = await this._loader.load(fontNames)
    const fontsNotFound: string[] = []
    const fontsNotLoaded: AcEdFontNotLoadedInfo[] = []
    loadStatus.forEach(item => {
      if (item.status === 'NotFound') {
        fontsNotFound.push(item.fontName)
      } else if (item.status === 'FailedToLoad') {
        fontsNotLoaded.push({
          fontName: item.fontName,
          url: item.url
        })
      }
    })
    if (fontsNotFound.length > 0) {
      eventBus.emit('fonts-not-found', {
        fonts: fontsNotFound
      })
    }
    if (fontsNotLoaded.length > 0) {
      eventBus.emit('fonts-not-loaded', {
        fonts: fontsNotLoaded
      })
    }
  }
}
