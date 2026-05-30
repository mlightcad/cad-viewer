/**
 * Maps AutoCAD / DXF font names to CSS {@code font-family} stacks for SVG text.
 *
 * SVG relies on the host environment's font renderer; this module approximates
 * DWG/DXF appearance by translating SHX/TTF style names to commonly available
 * system or web fonts.
 */
export type AcSvgFontMapping = Record<string, string>

const SHX_SUFFIX = /\.(shx|ttf|otf|woff2?)$/i

/** Built-in CAD font name → CSS font-family (first match wins in the UA). */
const DEFAULT_CAD_FONT_MAP: AcSvgFontMapping = {
  txt: 'Lucida Console, Courier New, monospace',
  simplex: 'Arial, Helvetica, sans-serif',
  romans: '"Times New Roman", Times, serif',
  romanc: '"Times New Roman", Times, serif',
  romand: '"Times New Roman", Times, serif',
  romant: '"Times New Roman", Times, serif',
  italic: '"Times New Roman", Times, serif',
  italict: '"Times New Roman", Times, serif',
  italicc: '"Times New Roman", Times, serif',
  monotxt: '"Courier New", Courier, monospace',
  isocp: 'Arial, Helvetica, sans-serif',
  isocp2: 'Arial, Helvetica, sans-serif',
  isocp3: 'Arial, Helvetica, sans-serif',
  isoct: 'Arial, Helvetica, sans-serif',
  isoct2: 'Arial, Helvetica, sans-serif',
  isoct3: 'Arial, Helvetica, sans-serif',
  gdt: 'Arial, Helvetica, sans-serif',
  greekc: '"Times New Roman", Times, serif',
  greeks: '"Times New Roman", Times, serif',
  simsun: 'SimSun, "Songti SC", STSong, serif',
  simhei: 'SimHei, "Heiti SC", STHeiti, sans-serif',
  simkai: 'KaiTi, "Kaiti SC", STKaiti, serif',
  simfang: 'FangSong, "Fangsong SC", STFangsong, serif',
  msyh: '"Microsoft YaHei", "PingFang SC", sans-serif',
  dengxian: 'DengXian, "Microsoft YaHei", sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  'times new roman': '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
  tahoma: 'Tahoma, Geneva, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif'
}

/** Optional per-font size scale to better match SHX cap height in SVG. */
const DEFAULT_FONT_SIZE_SCALE: AcSvgFontMapping = {
  arial: '1',
  romans: '1.05',
  txt: '1.1',
  simplex: '1.05',
  isocp: '1'
}

let customFontMap: AcSvgFontMapping = {}
let customSizeScale: AcSvgFontMapping = {}

function normalizeFontKey(name: string): string {
  return name.trim().replace(SHX_SUFFIX, '').toLowerCase()
}

/**
 * Resolves a CAD font name to a CSS {@code font-family} value.
 */
export function resolveSvgFontFamily(
  cadFontName: string | undefined,
  fallback?: string
): string {
  const fallbackFamily = fallback?.trim() || 'sans-serif'
  if (!cadFontName?.trim()) {
    return resolveSvgFontFamily(fallbackFamily, 'sans-serif')
  }

  const key = normalizeFontKey(cadFontName)
  const mapped =
    customFontMap[key] ??
    DEFAULT_CAD_FONT_MAP[key] ??
    customFontMap[cadFontName.toLowerCase()]

  if (mapped) {
    return mapped
  }

  if (SHX_SUFFIX.test(cadFontName)) {
    return fallbackFamily
  }

  return cadFontName.includes(',')
    ? cadFontName
    : `"${cadFontName}", ${fallbackFamily}`
}

/**
 * Returns a font-size multiplier for the given CAD font (default {@code 1}).
 */
export function resolveSvgFontSizeScale(
  cadFontName: string | undefined
): number {
  if (!cadFontName?.trim()) {
    return 1
  }
  const key = normalizeFontKey(cadFontName)
  const raw =
    customSizeScale[key] ??
    DEFAULT_FONT_SIZE_SCALE[key] ??
    customSizeScale[cadFontName.toLowerCase()]
  if (raw == null) {
    return 1
  }
  const scale = Number(raw)
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

/** Overrides or extends the built-in CAD → CSS font mapping. */
export function setSvgFontMapping(mapping: AcSvgFontMapping): void {
  customFontMap = { ...mapping }
}

/** Overrides per-font cap-height scale factors. Values are numeric strings. */
export function setSvgFontSizeScales(scales: AcSvgFontMapping): void {
  customSizeScale = { ...scales }
}

/** Strips SHX/TTF extensions and lowercases a CAD font file name. */
export function normalizeCadFontName(fontName: string): string {
  return normalizeFontKey(fontName)
}
