import type { AcDbDatabase } from '@mlightcad/data-model'

/**
 * Collects unique font face names referenced by the drawing text style table.
 *
 * Uses {@link AcDbTextStyleTable.fonts} (primary + big-font file names) plus
 * TrueType {@link AcDbTextStyleTableRecord} `extendedFont` faces that are not
 * always present on `fileName`.
 */
export function collectTextStyleFontNames(database: AcDbDatabase): string[] {
  const names: string[] = []
  try {
    const table = database.tables.textStyleTable
    // Primary + big-font file names (already normalized/deduped by data-model).
    names.push(...(table.fonts ?? []))
    // Also pick TrueType `font` / `extendedFont` when they differ from fileName
    // (e.g. face "仿宋" with an empty primary file).
    if (table.newIterator) {
      for (const record of table.newIterator()) {
        const style = (
          record as {
            textStyle?: {
              font?: string
              bigFont?: string
              extendedFont?: string
            }
          }
        ).textStyle
        if (style?.font) names.push(style.font)
        if (style?.bigFont) names.push(style.bigFont)
        if (style?.extendedFont) names.push(style.extendedFont)
      }
    }
  } catch {
    return []
  }
  return dedupeFontNames(names)
}

export interface AcApTextStyleFontPreloadPlan {
  /**
   * Style-table faces loaded on the main thread before deferred glyph finalize.
   * Matches {@link FontManager.awaitFontsBeforeDraw} content/style await set.
   */
  critical: string[]
  /**
   * Small subset of {@link critical} that is also in the active default/symbol
   * preset. Kept for diagnostics / planning; open-time preset load now covers
   * the full chain via {@link AcApDocManager.ensurePresetFontsForOpen}.
   */
  workerWarm: string[]
  /**
   * Unused preset fallback faces (not referenced by the style table).
   * Loaded at open start with the rest of the preset — not as a STYLE-stage
   * background request.
   */
  background: string[]
}

/**
 * Splits style-table faces (critical) from unused preset fallbacks (background)
 * and picks a small worker warm set.
 *
 * When the style table is empty, the first default face is promoted to critical
 * so Latin metrics still resolve before the first glyph bake.
 */
export function planTextStyleFontPreload(
  styleFonts: readonly string[],
  fallbackFonts: readonly string[],
  options?: { firstDefaultFont?: string }
): AcApTextStyleFontPreloadPlan {
  const critical = dedupeFontNames([...styleFonts])
  if (critical.length === 0 && options?.firstDefaultFont) {
    critical.push(options.firstDefaultFont)
  }
  const criticalKeys = new Set(critical.map(normalizeFontNameKey))
  const fallbackKeys = new Set(fallbackFonts.map(normalizeFontNameKey))
  const background = dedupeFontNames(
    fallbackFonts.filter(name => !criticalKeys.has(normalizeFontNameKey(name)))
  )
  // Prefer preset faces already referenced by styles (usually 0–3 names). Cap
  // so a pathological preset cannot reintroduce a multi-megafont worker barrier.
  let workerWarm = dedupeFontNames(
    critical.filter(name => fallbackKeys.has(normalizeFontNameKey(name)))
  )
  if (workerWarm.length === 0 && options?.firstDefaultFont) {
    const key = normalizeFontNameKey(options.firstDefaultFont)
    if (key && criticalKeys.has(key)) {
      workerWarm = [options.firstDefaultFont]
    }
  }
  if (workerWarm.length > 3) {
    workerWarm = workerWarm.slice(0, 3)
  }
  return { critical, workerWarm, background }
}

/** Case-insensitive unique list preserving first-seen casing. */
export function dedupeFontNames(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of names) {
    if (!name) continue
    const key = normalizeFontNameKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export function normalizeFontNameKey(fontName: string): string {
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
