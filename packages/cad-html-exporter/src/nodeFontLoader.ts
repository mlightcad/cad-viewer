import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import type { AcDbDatabase } from '@mlightcad/data-model'
import {
  type FontInfo,
  type FontLoader,
  type FontLoadStatus,
  FontManager
} from '@mlightcad/mtext-renderer'
import { AcTrMTextRenderer } from '@mlightcad/three-renderer'

import { nodeFetchBytes } from './nodeProxy'

/** Same CDN root the viewer uses (`…/cad-data/fonts/`). */
export const DEFAULT_EXPORT_FONTS_URL =
  'https://cdn.jsdelivr.net/gh/mlightcad/cad-data/fonts/'

const DEFAULT_FONTS_PRESET = 'modern' as const

const FONT_EXTS = new Set(['.shx', '.ttf', '.otf', '.woff', '.woff2'])

/**
 * Initializes main-thread MText rendering and a Node-capable font loader.
 *
 * Headless export previously never called {@link AcTrMTextRenderer.initialize},
 * so every TEXT/MTEXT `asyncDraw` failed with "not initialized" and produced
 * empty geometry. THREE.FileLoader (XHR) also does not work in Node, so the
 * default CDN loader is replaced with `fetch` + {@link FontManager.cacheFont}.
 */
export async function setupExportTextRendering(options: {
  fontsDir?: string
  fontsUrl?: string
}): Promise<void> {
  const fontManager = FontManager.instance
  // IndexedDB is unavailable in Node; skip cache lookups/writes.
  fontManager.enableFontCache = false
  fontManager.setDefaultFonts(DEFAULT_FONTS_PRESET)
  fontManager.lazyFontLoading = true
  fontManager.awaitFontsBeforeDraw = true

  const mtext = AcTrMTextRenderer.getInstance()
  mtext.setRenderMode('main')
  // Main mode does not need a worker URL.
  mtext.initialize()
  // Headless export builds per-layer AcTrBatchedGroup trees and never runs the
  // viewer's mesh-glyph InstancedMesh flush. Keep merge mode so TrueType glyphs
  // remain as Mesh children on each entity.
  mtext.setMeshGlyphInstancing(false)
  await mtext.setDefaultFonts(DEFAULT_FONTS_PRESET)
  await mtext.setLazyFontLoading(true)
  await mtext.setAwaitFontsBeforeDraw(true)

  if (options.fontsDir) {
    const loader = await createLocalFontLoader(options.fontsDir)
    fontManager.setFontLoader(loader)
  } else {
    const baseUrl = normalizeFontsBaseUrl(
      options.fontsUrl ?? DEFAULT_EXPORT_FONTS_URL
    )
    const loader = createFetchFontLoader(baseUrl)
    fontManager.setFontLoader(loader)
    fontManager.baseUrl = baseUrl
  }

  // Warm default / symbol faces so the first text entities do not race CDN I/O.
  try {
    warnFailedFonts(
      await fontManager.loadFontsByNames([...fontManager.getFontsToLoad()])
    )
  } catch (error) {
    warnFontPreloadFailure('default', error)
  }
}

/**
 * Preloads faces referenced by the drawing text style table (plus defaults).
 * Mirrors the viewer's open-time style preload so glyph `asyncDraw` does not
 * serialize on per-entity CDN fetches.
 */
export async function preloadDrawingFonts(
  database: AcDbDatabase
): Promise<void> {
  const fontManager = FontManager.instance
  const names = new Set<string>([...fontManager.getFontsToLoad()])
  try {
    const table = database.tables.textStyleTable
    for (const file of table?.fonts ?? []) {
      if (file) names.add(file)
    }
    if (table?.newIterator) {
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
        if (style?.font) names.add(style.font)
        if (style?.bigFont) names.add(style.bigFont)
        if (style?.extendedFont) names.add(style.extendedFont)
      }
    }
  } catch {
    // Style table may be incomplete; on-demand loads still work.
  }
  if (names.size === 0) return
  try {
    warnFailedFonts(await fontManager.loadFontsByNames([...names]))
  } catch (error) {
    warnFontPreloadFailure('drawing', error)
  }
}

function warnFailedFonts(statuses: FontLoadStatus[]): void {
  const failed = statuses.filter(status => status.status === 'FailedToLoad')
  if (failed.length === 0) return
  console.warn(
    `[cad-html-exporter] failed to load fonts: ${failed
      .map(status => status.fontName)
      .join(', ')}. Mesh text will be missing from the export.`
  )
}

function warnFontPreloadFailure(kind: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(
    `[cad-html-exporter] ${kind} font preload failed (${message}). Set HTTPS_PROXY or a Windows system proxy so the font CDN is reachable; otherwise mesh text is omitted.`
  )
}

function normalizeFontsBaseUrl(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

function fontTypeForFile(file: string): 'mesh' | 'shx' {
  const ext = extname(file).toLowerCase()
  return ext === '.shx' ? 'shx' : 'mesh'
}

function stemOf(file: string): string {
  const ext = extname(file)
  return (ext ? file.slice(0, -ext.length) : file).toLowerCase()
}

/**
 * Resolves a local font library.
 *
 * Accepts a folder of face files, that folder when it also contains
 * `fonts.json`, or a cad-data checkout whose faces live in `fonts/`.
 */
export async function resolveLocalFontRoot(fontsDir: string): Promise<string> {
  if (await readFontCatalog(fontsDir)) return fontsDir
  const nested = join(fontsDir, 'fonts')
  if (await readFontCatalog(nested)) return nested
  return fontsDir
}

async function readFontCatalog(root: string): Promise<FontInfo[] | undefined> {
  try {
    const parsed = JSON.parse(
      await readFile(join(root, 'fonts.json'), 'utf8')
    ) as unknown
    return Array.isArray(parsed) ? (parsed as FontInfo[]) : undefined
  } catch {
    return undefined
  }
}

function indexLocalFont(
  entries: Map<string, { info: FontInfo; path: string }>,
  info: FontInfo,
  path: string
): void {
  const keys = new Set<string>([stemOf(info.file)])
  for (const alias of info.name) {
    const key = stemOf(alias)
    if (key) keys.add(key)
  }
  for (const key of keys) {
    if (!entries.has(key)) entries.set(key, { info, path })
  }
}

async function createLocalFontLoader(fontsDir: string): Promise<FontLoader> {
  const root = await resolveLocalFontRoot(fontsDir)
  const entries = new Map<string, { info: FontInfo; path: string }>()
  const fonts: FontInfo[] = []
  const catalog = await readFontCatalog(root)

  if (catalog) {
    for (const item of catalog) {
      if (!item?.file) continue
      const info: FontInfo = {
        name: item.name?.length ? item.name : [stemOf(item.file)],
        file: item.file,
        type: item.type ?? fontTypeForFile(item.file),
        url: '',
        source: 'cache',
        encoding: item.encoding
      }
      fonts.push(info)
      indexLocalFont(entries, info, join(root, item.file))
    }
  }

  const files = await readdir(root)
  for (const file of files) {
    const ext = extname(file).toLowerCase()
    if (!FONT_EXTS.has(ext)) continue
    const stem = stemOf(file)
    if (entries.has(stem)) continue
    const info: FontInfo = {
      name: [stem],
      file,
      type: fontTypeForFile(file),
      url: '',
      source: 'cache'
    }
    fonts.push(info)
    indexLocalFont(entries, info, join(root, file))
  }

  return {
    get baseUrl() {
      return fontsDir
    },
    set baseUrl(_value: string) {
      // Local catalog is fixed at construction time.
    },
    async getAvailableFonts() {
      return fonts
    },
    async load(fontNames: readonly string[]): Promise<FontLoadStatus[]> {
      const statuses: FontLoadStatus[] = []
      for (const name of fontNames) {
        const key = stemOf(name)
        if (!key) continue
        if (FontManager.instance.isFontLoaded(key)) {
          statuses.push({ fontName: key, url: '', status: 'Success' })
          continue
        }
        const entry = entries.get(key)
        if (!entry) {
          statuses.push({ fontName: key, url: '', status: 'NotFound' })
          continue
        }
        const fileStem = stemOf(entry.info.file)
        if (FontManager.instance.isFontLoaded(fileStem)) {
          statuses.push({ fontName: key, url: '', status: 'Success' })
          continue
        }
        try {
          const buf = await readFile(entry.path)
          const ab = new ArrayBuffer(buf.byteLength)
          new Uint8Array(ab).set(buf)
          statuses.push(
            await FontManager.instance.cacheFont(
              ab,
              entry.info.file,
              entry.info.name,
              entry.info.encoding
            )
          )
        } catch {
          statuses.push({ fontName: key, url: '', status: 'FailedToLoad' })
        }
      }
      return statuses
    }
  }
}

function createFetchFontLoader(baseUrl: string): FontLoader {
  let available: FontInfo[] = []
  let availablePromise: Promise<FontInfo[]> | null = null
  const byName = new Map<string, FontInfo>()
  let currentBase = baseUrl

  async function ensureCatalog(): Promise<FontInfo[]> {
    if (available.length > 0) return available
    if (availablePromise) return availablePromise
    const url = `${currentBase}fonts.json`
    availablePromise = (async () => {
      const response = await nodeFetchBytes(url)
      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `Failed to fetch font catalog: ${url} (${response.status})`
        )
      }
      const fonts = JSON.parse(new TextDecoder().decode(response.bytes)) as FontInfo[]
      for (const font of fonts) {
        font.url = `${currentBase}${font.file}`
        for (const alias of font.name) {
          byName.set(alias.toLowerCase(), font)
        }
        byName.set(stemOf(font.file), font)
      }
      available = fonts
      return fonts
    })().finally(() => {
      availablePromise = null
    })
    return availablePromise
  }

  return {
    get baseUrl() {
      return currentBase
    },
    set baseUrl(value: string) {
      const next = normalizeFontsBaseUrl(value)
      if (next === currentBase) return
      currentBase = next
      available = []
      byName.clear()
      availablePromise = null
    },
    async getAvailableFonts() {
      return ensureCatalog()
    },
    async load(fontNames: readonly string[]): Promise<FontLoadStatus[]> {
      await ensureCatalog()
      const statuses: FontLoadStatus[] = []
      for (const name of fontNames) {
        const key = stemOf(name)
        if (!key) continue
        if (FontManager.instance.isFontLoaded(key)) {
          statuses.push({ fontName: key, url: '', status: 'Success' })
          continue
        }
        const info = byName.get(key)
        if (!info) {
          statuses.push({ fontName: key, url: '', status: 'NotFound' })
          continue
        }
        const fileStem = stemOf(info.file)
        if (FontManager.instance.isFontLoaded(fileStem)) {
          statuses.push({ fontName: key, url: info.url, status: 'Success' })
          continue
        }
        try {
          const response = await nodeFetchBytes(info.url)
          if (response.status < 200 || response.status >= 300) {
            statuses.push({
              fontName: key,
              url: info.url,
              status: 'FailedToLoad'
            })
            continue
          }
          const ab = new ArrayBuffer(response.bytes.byteLength)
          new Uint8Array(ab).set(response.bytes)
          const status = await FontManager.instance.cacheFont(
            ab,
            basename(info.file),
            info.name
          )
          statuses.push({
            fontName: key,
            url: info.url,
            status: status.status
          })
        } catch {
          statuses.push({
            fontName: key,
            url: info.url,
            status: 'FailedToLoad'
          })
        }
      }
      return statuses
    }
  }
}
