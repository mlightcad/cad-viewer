import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import type { AcDbDatabase } from '@mlightcad/data-model'
import {
  type FontInfo,
  type FontLoader,
  type FontLoadStatus,
  FontManager
} from '@mlightcad/mtext-renderer'
import type { AcPdfTextFontResolver } from '@mlightcad/pdf-renderer'
import { AcTrMTextRenderer } from '@mlightcad/three-renderer'

import { nodeFetchBytes } from './nodeProxy'

/** Same CDN root the viewer uses (`…/cad-data/fonts/`). */
export const DEFAULT_EXPORT_FONTS_URL =
  'https://cdn.jsdelivr.net/gh/mlightcad/cad-data/fonts/'

const DEFAULT_FONTS_PRESET = 'modern' as const

const FONT_EXTS = new Set(['.shx', '.ttf', '.otf', '.woff', '.woff2'])

const LOG_PREFIX = '[cad-pdf-exporter]'

/** One catalog face and how to read its raw program bytes. */
interface FontEntry {
  info: FontInfo
  read: () => Promise<Uint8Array>
}

/**
 * Font library bound to one export: the catalog the mesh-text loader uses,
 * plus raw font programs for `textMode: 'text'` embedding.
 */
export interface NodeFontLibrary {
  /** Loader installed on {@link FontManager}. */
  loader: FontLoader
  /** Looks up a face by file stem or catalog alias (case-insensitive). */
  find(fontName: string): Promise<FontEntry | undefined>
}

/**
 * Initializes main-thread MText rendering and a Node-capable font loader.
 *
 * The PDF glyph provider (vector text, SHX, and the text-mode fallback) draws
 * through {@link AcTrMTextRenderer}, which must be initialized in `'main'`
 * mode. THREE.FileLoader (XHR) does not work in Node, so the default CDN
 * loader is replaced with `fetch` + {@link FontManager.cacheFont}.
 *
 * @returns The font library, used to embed fonts for `textMode: 'text'`
 */
export async function setupExportTextRendering(options: {
  fontsDir?: string
  fontsUrl?: string
}): Promise<NodeFontLibrary> {
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
  // The glyph provider extracts per-entity Mesh/Line geometry; keep merge
  // mode so glyphs are not deferred into scene-level InstancedMeshes.
  mtext.setMeshGlyphInstancing(false)
  await mtext.setDefaultFonts(DEFAULT_FONTS_PRESET)
  await mtext.setLazyFontLoading(true)
  await mtext.setAwaitFontsBeforeDraw(true)

  let library: NodeFontLibrary
  if (options.fontsDir) {
    library = await createLocalFontLibrary(options.fontsDir)
    fontManager.setFontLoader(library.loader)
  } else {
    const baseUrl = normalizeFontsBaseUrl(
      options.fontsUrl ?? DEFAULT_EXPORT_FONTS_URL
    )
    library = createFetchFontLibrary(baseUrl)
    fontManager.setFontLoader(library.loader)
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
  return library
}

/**
 * Preloads faces referenced by the drawing text style table (plus defaults).
 * Mirrors the viewer's open-time style preload so glyph rendering does not
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

/**
 * Resolves embeddable TTF/OTF/WOFF programs for `textMode: 'text'` from the
 * export font library.
 *
 * Lookup mirrors on-screen text: a direct catalog hit first, then the font
 * manager's replacement (`findAndReplaceFont`) for names the catalog does not
 * list. A direct SHX hit stays SHX, so those texts keep vector glyphs, and
 * faces that cannot be read resolve `undefined` (vector fallback).
 *
 * @param library - Library returned by {@link setupExportTextRendering}
 */
export function createNodeTextFontResolver(
  library: NodeFontLibrary
): AcPdfTextFontResolver {
  return async fontName => {
    let entry = await library.find(fontName)
    if (!entry) {
      const replacement = FontManager.instance.findAndReplaceFont(fontName)
      if (replacement && replacement !== fontName) {
        entry = await library.find(replacement)
      }
    }
    if (!entry || entry.info.type !== 'mesh') {
      // Called at most once per unique font name (the renderer caches
      // negative results), so this cannot flood the log.
      console.warn(
        `${LOG_PREFIX} No embeddable font for "${fontName}" ` +
          `(catalog=${entry ? entry.info.type : 'miss'}); ` +
          'texts using it are painted as vector glyphs'
      )
      return undefined
    }
    try {
      const bytes = await entry.read()
      return bytes.byteLength > 0 ? bytes : undefined
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Font "${fontName}" could not be read ` +
          `(${error instanceof Error ? error.message : String(error)}); ` +
          'texts using it are painted as vector glyphs'
      )
      return undefined
    }
  }
}

function warnFailedFonts(statuses: FontLoadStatus[]): void {
  const failed = statuses.filter(status => status.status === 'FailedToLoad')
  if (failed.length === 0) return
  console.warn(
    `${LOG_PREFIX} failed to load fonts: ${failed
      .map(status => status.fontName)
      .join(', ')}. Text using them will be missing from the export.`
  )
}

function warnFontPreloadFailure(kind: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(
    `${LOG_PREFIX} ${kind} font preload failed (${message}). Set HTTPS_PROXY or a Windows system proxy so the font CDN is reachable, or pass fontsDir; otherwise text is omitted.`
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

/** Copies bytes into a standalone `ArrayBuffer` for {@link FontManager.cacheFont}. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(ab).set(bytes)
  return ab
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

function indexFont(
  entries: Map<string, FontEntry>,
  info: FontInfo,
  read: () => Promise<Uint8Array>
): void {
  const entry: FontEntry = { info, read }
  const keys = new Set<string>([stemOf(info.file)])
  for (const alias of info.name) {
    const key = stemOf(alias)
    if (key) keys.add(key)
  }
  for (const key of keys) {
    if (!entries.has(key)) entries.set(key, entry)
  }
}

/** Memoizes one async read per face so load + embed share the bytes. */
function memoRead(read: () => Promise<Uint8Array>): () => Promise<Uint8Array> {
  let pending: Promise<Uint8Array> | undefined
  return () => {
    if (!pending) {
      pending = read().catch(error => {
        pending = undefined
        throw error
      })
    }
    return pending
  }
}

async function createLocalFontLibrary(
  fontsDir: string
): Promise<NodeFontLibrary> {
  const root = await resolveLocalFontRoot(fontsDir)
  const entries = new Map<string, FontEntry>()
  const fonts: FontInfo[] = []
  const catalog = await readFontCatalog(root)
  const readerFor = (path: string) =>
    memoRead(async () => new Uint8Array(await readFile(path)))

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
      indexFont(entries, info, readerFor(join(root, item.file)))
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
    indexFont(entries, info, readerFor(join(root, file)))
  }

  const loader: FontLoader = {
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
        if (FontManager.instance.isFontLoaded(stemOf(entry.info.file))) {
          statuses.push({ fontName: key, url: '', status: 'Success' })
          continue
        }
        try {
          statuses.push(
            await FontManager.instance.cacheFont(
              toArrayBuffer(await entry.read()),
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

  return {
    loader,
    async find(fontName) {
      return entries.get(stemOf(fontName))
    }
  }
}

function createFetchFontLibrary(baseUrl: string): NodeFontLibrary {
  let available: FontInfo[] = []
  let availablePromise: Promise<FontInfo[]> | null = null
  const entries = new Map<string, FontEntry>()
  let currentBase = baseUrl

  const readerFor = (url: string) =>
    memoRead(async () => {
      const response = await nodeFetchBytes(url)
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status} ${url}`)
      }
      return response.bytes
    })

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
      const fonts = JSON.parse(
        new TextDecoder().decode(response.bytes)
      ) as FontInfo[]
      for (const font of fonts) {
        font.url = `${currentBase}${font.file}`
        indexFont(entries, font, readerFor(font.url))
      }
      available = fonts
      return fonts
    })().finally(() => {
      availablePromise = null
    })
    return availablePromise
  }

  const loader: FontLoader = {
    get baseUrl() {
      return currentBase
    },
    set baseUrl(value: string) {
      const next = normalizeFontsBaseUrl(value)
      if (next === currentBase) return
      currentBase = next
      available = []
      entries.clear()
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
        const entry = entries.get(key)
        if (!entry) {
          statuses.push({ fontName: key, url: '', status: 'NotFound' })
          continue
        }
        const { info } = entry
        if (FontManager.instance.isFontLoaded(stemOf(info.file))) {
          statuses.push({ fontName: key, url: info.url, status: 'Success' })
          continue
        }
        try {
          const status = await FontManager.instance.cacheFont(
            toArrayBuffer(await entry.read()),
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

  return {
    loader,
    async find(fontName) {
      try {
        await ensureCatalog()
      } catch {
        return undefined
      }
      return entries.get(stemOf(fontName))
    }
  }
}
