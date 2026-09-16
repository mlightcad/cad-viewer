import { AcApFontUtil } from '@mlightcad/cad-simple-viewer'
import type { AcPdfTextFontResolver } from '@mlightcad/pdf-renderer'

/**
 * Resolves embeddable TTF/OTF/WOFF font programs for `textMode: 'text'` PDF
 * exports from the viewer font catalog.
 *
 * Lookup mirrors on-screen text rendering: direct catalog hit first, then the
 * font manager's replacement chain (`getReplacementFontName`) for style fonts
 * the catalog does not list ("Standard", localized aliases like "标准", …).
 * Only a catalog *miss* falls through to the replacement — a direct SHX hit
 * stays SHX so those texts keep their vector-glyph appearance in the PDF.
 *
 * The catalog entry's `url` is fetched on demand; bytes are not kept between
 * calls beyond pdf-lib's own embed cache, so a document using several CJK
 * faces embeds each subset once regardless of how many texts reference it.
 *
 * SHX fonts have no embeddable program and resolve `undefined` — the renderer
 * then paints those texts as vector glyphs, matching the on-screen fallback.
 */
export const resolveViewerTextFont: AcPdfTextFontResolver = async fontName => {
  const info = findEmbeddableInfo(fontName)
  if (!info || info.type !== 'mesh' || !info.url) {
    // Called at most once per unique font name (negative results are cached
    // by the renderer's font manager), so this cannot flood the log.
    console.warn(
      `[cad-pdf-plugin] No embeddable font for "${fontName}" ` +
        `(catalog=${info ? info.type : 'miss'}, url=${info?.url ? 'yes' : 'no'}); ` +
        'texts using it are painted as vector glyphs'
    )
    return undefined
  }
  try {
    const res = await fetch(info.url)
    if (!res.ok) {
      console.warn(
        `[cad-pdf-plugin] Font "${fontName}" fetch failed (${res.status} ${info.url}); ` +
          'texts using it are painted as vector glyphs'
      )
      return undefined
    }
    const bytes = new Uint8Array(await res.arrayBuffer())
    return bytes.byteLength > 0 ? bytes : undefined
  } catch (error) {
    console.warn(
      `[cad-pdf-plugin] Font "${fontName}" fetch errored (${info.url}): ` +
        `${error instanceof Error ? error.message : String(error)}; ` +
        'texts using it are painted as vector glyphs'
    )
    return undefined
  }
}

function findEmbeddableInfo(fontName: string) {
  const direct = AcApFontUtil.findFontInfoByName(fontName)
  if (direct) {
    return direct
  }
  const replacement = AcApFontUtil.getReplacementFontName(fontName)
  return replacement && replacement !== fontName
    ? AcApFontUtil.findFontInfoByName(replacement)
    : undefined
}
