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
 * Prefer the session mesh-font program cache populated when the viewer
 * FileLoader (or an earlier PDF resolve) already downloaded the face. MeshFont
 * itself keeps only parsed glyph tables, so without that cache PDF export would
 * `fetch` the catalog URL again. Fall back to `fetch` when the cache misses.
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

  const cached =
    AcApFontUtil.getLoadedMeshFontProgram(fontName) ??
    (info.name?.[0]
      ? AcApFontUtil.getLoadedMeshFontProgram(info.name[0])
      : undefined)
  if (cached && cached.byteLength > 0) {
    return cached
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
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength <= 0) {
      return undefined
    }
    const names = [fontName, ...(info.name ?? []), info.file].filter(
      (n): n is string => typeof n === 'string' && n.length > 0
    )
    AcApFontUtil.rememberMeshFontProgram(buffer, names, info.url)
    return new Uint8Array(buffer)
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
