import {
  type FontInfo,
  FontManager,
  type FontType,
  type ShxFontData,
  ShxParserFont
} from '@mlightcad/mtext-renderer'

import { AcApDocManager } from '../app/AcApDocManager'

export type { FontInfo, FontType, ShxFontData } from '@mlightcad/mtext-renderer'
export { ShxParserFont } from '@mlightcad/mtext-renderer'

/**
 * Font helpers for MTEXT and UI (character map, ribbon): wraps the shared
 * {@link FontManager} cache, SHX parsing ({@link ShxParserFont}), and drawing
 * font catalog ({@link AcApDocManager}).
 *
 * @remarks
 * Keeps UI packages off direct `@mlightcad/mtext-renderer` imports while using
 * the same global font pipeline as rendering.
 */
export class AcApFontUtil {
  /**
   * @inheritdoc FontManager.isFontLoaded
   */
  static isFontLoaded(fontName: string): boolean {
    return FontManager.instance.isFontLoaded(fontName)
  }

  /**
   * @inheritdoc FontManager.getFontType
   */
  static getFontType(fontName: string): FontType | undefined {
    return FontManager.instance.getFontType(fontName)
  }

  /**
   * Font name used at render time when the requested font is missing.
   *
   * Checks user {@link FontManager.setFontMapping | font mapping} first, then falls
   * back to {@link FontManager.defaultFonts}.
   *
   * @param fontName - Original font name referenced by the drawing.
   * @returns The loaded font name if available; otherwise the mapped or default replacement.
   */
  static getReplacementFontName(fontName: string): string {
    return FontManager.instance.findAndReplaceFont(fontName)
  }

  /**
   * Sorted SHX glyph indices present in the loaded font payload.
   *
   * @param fontName - Name as registered in the font manager after load.
   * @returns Code list, or empty when the font is missing or not SHX.
   */
  static getShxCodePoints(fontName: string): number[] {
    const font = FontManager.instance.getFontByName(fontName, false)
    if (!font || font.type !== 'shx') return []
    const data = font.data as ShxFontData
    const keys = Object.keys(data.content?.data ?? {})
    return keys
      .map(k => Number(k))
      .filter(n => Number.isFinite(n))
      .sort((a, b) => a - b)
  }

  /**
   * Raw SHX font data for UI previews (e.g. character map SVG).
   *
   * @param fontName - Name as registered in {@link FontManager}.
   * @returns Parsed SHX payload, or `undefined` if unavailable or not SHX.
   */
  static getLoadedShxFontData(fontName: string): ShxFontData | undefined {
    const font = FontManager.instance.getFontByName(fontName, false)
    if (!font || font.type !== 'shx') return undefined
    return font.data as ShxFontData
  }

  /**
   * Creates a SHX parser for inline SVG glyph previews.
   *
   * @param data - Parsed SHX payload from {@link getLoadedShxFontData}.
   */
  static createShxParserFont(data: ShxFontData): ShxParserFont {
    return new ShxParserFont(data)
  }

  /**
   * Looks up {@link FontInfo} for a display name against the drawing’s available-font
   * catalog ({@link AcApDocManager.instance.avaiableFonts}).
   *
   * @remarks
   * Matching is case-insensitive; the first catalog entry whose `name` array
   * contains a trimmed, case-insensitive match wins.
   */
  static findFontInfoByName(fontName: string): FontInfo | undefined {
    const list = AcApDocManager.instance?.avaiableFonts ?? []
    const target = fontName.trim().toLowerCase()
    if (!target) return undefined
    return list.find(info =>
      info.name.some(n => n.trim().toLowerCase() === target)
    )
  }

  /**
   * Declared font engine kind from the CAD font catalog only (before or after load).
   *
   * @remarks
   * Use when {@link AcApFontUtil} has not yet loaded the font: the catalog still
   * knows `shx` vs `mesh`. After load, {@link getFontType} is authoritative.
   */
  static getCatalogFontType(fontName: string): 'shx' | 'mesh' | undefined {
    return AcApFontUtil.findFontInfoByName(fontName)?.type
  }

  /**
   * Loads a font through the same pipeline as MTEXT rendering so binaries are cached
   * and SHX glyph tables are available.
   *
   * @remarks
   * No-ops when there is no {@link AcApDocManager.instance} or the font is already
   * loaded. Delegates to {@link AcApDocManager.loadFonts}.
   */
  static async ensureDrawingFontLoaded(fontName: string): Promise<void> {
    const dm = AcApDocManager.instance
    if (!dm) return
    if (AcApFontUtil.isFontLoaded(fontName)) return
    await dm.loadFonts([fontName])
  }
}
