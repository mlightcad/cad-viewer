/**
 * Where PDF.js loads binary data it does not bundle: CMaps (needed by CJK
 * and other CID fonts such as `Adobe-GB1`) and the standard 14 font
 * programs. Without them PDF.js cannot map glyphs to Unicode and imported
 * text silently disappears.
 */
export interface AcApPdfImportResourceUrls {
  /**
   * Folder holding the `*.bcmap` files from `pdfjs-dist/cmaps/`, ending in
   * `/`.
   */
  cMapUrl: string
  /**
   * Folder holding the files from `pdfjs-dist/standard_fonts/`, ending in
   * `/`.
   */
  standardFontDataUrl: string
}

let overrides: Partial<AcApPdfImportResourceUrls> = {}

const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`)

/**
 * Default resource folders: the jsDelivr copy of the exact `pdfjs-dist`
 * version in use, so the binary formats always match the parser.
 *
 * @param pdfjsVersion - `pdfjsLib.version`
 */
export function acapPdfDefaultImportResourceUrls(
  pdfjsVersion: string
): AcApPdfImportResourceUrls {
  const base = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/`
  return {
    cMapUrl: `${base}cmaps/`,
    standardFontDataUrl: `${base}standard_fonts/`
  }
}

/**
 * Overrides where PDF import loads CMaps and standard fonts, e.g. to serve
 * copies of `pdfjs-dist/cmaps/` and `pdfjs-dist/standard_fonts/` from the
 * host app for offline use. Omitted fields keep their current value; pass
 * `undefined` for both to restore the CDN defaults.
 *
 * @param urls - Folder URLs (a trailing `/` is added when missing)
 */
export function acapPdfSetImportResourceUrls(
  urls: Partial<AcApPdfImportResourceUrls> | undefined
) {
  if (!urls) {
    overrides = {}
    return
  }
  overrides = {
    ...overrides,
    ...(urls.cMapUrl ? { cMapUrl: withTrailingSlash(urls.cMapUrl) } : {}),
    ...(urls.standardFontDataUrl
      ? { standardFontDataUrl: withTrailingSlash(urls.standardFontDataUrl) }
      : {})
  }
}

/**
 * Resource folders PDF import passes to `pdfjsLib.getDocument`.
 *
 * @param pdfjsVersion - `pdfjsLib.version`
 */
export function acapPdfImportResourceUrls(
  pdfjsVersion: string
): AcApPdfImportResourceUrls {
  return { ...acapPdfDefaultImportResourceUrls(pdfjsVersion), ...overrides }
}
