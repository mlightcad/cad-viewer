/**
 * Session cache of raw mesh font programs (TTF/OTF/WOFF ArrayBuffers).
 *
 * {@link FontManager} parses mesh fonts into glyph tables and drops the source
 * buffer from {@link MeshFont.data}. PDF text-mode embedding still needs those
 * bytes, so this cache retains the program when the viewer's FileLoader (or an
 * explicit remember call) first obtains it — avoiding a second network fetch
 * on export.
 */
const byName = new Map<string, ArrayBuffer>()
const byUrl = new Map<string, ArrayBuffer>()

function normalizeName(fontName: string): string {
  const trimmed = fontName.trim().toLowerCase()
  if (!trimmed) return ''
  const dot = trimmed.lastIndexOf('.')
  if (
    dot > 0 &&
    (dot === trimmed.length - 4 || dot === trimmed.length - 5)
  ) {
    return trimmed.slice(0, dot)
  }
  return trimmed
}

function normalizeUrl(url: string): string {
  return url.trim()
}

/**
 * Remembers a mesh font program under one or more logical names.
 */
export function rememberMeshFontProgramByName(
  fontName: string,
  data: ArrayBuffer
): void {
  const key = normalizeName(fontName)
  if (!key || data.byteLength <= 0) return
  byName.set(key, data)
}

/**
 * Remembers a mesh font program under its download URL.
 */
export function rememberMeshFontProgramByUrl(
  url: string,
  data: ArrayBuffer
): void {
  const key = normalizeUrl(url)
  if (!key || data.byteLength <= 0) return
  byUrl.set(key, data)
}

/**
 * Looks up a cached program by font name (case-insensitive, extension stripped).
 */
export function getMeshFontProgramByName(
  fontName: string
): ArrayBuffer | undefined {
  const key = normalizeName(fontName)
  if (!key) return undefined
  return byName.get(key)
}

/**
 * Looks up a cached program by download URL.
 */
export function getMeshFontProgramByUrl(url: string): ArrayBuffer | undefined {
  const key = normalizeUrl(url)
  if (!key) return undefined
  return byUrl.get(key)
}

/**
 * Drops all remembered programs (tests / full font release).
 */
export function clearMeshFontProgramCache(): void {
  byName.clear()
  byUrl.clear()
}

/**
 * Test/diagnostics: number of distinct name keys currently cached.
 */
export function meshFontProgramCacheSize(): {
  names: number
  urls: number
} {
  return { names: byName.size, urls: byUrl.size }
}
