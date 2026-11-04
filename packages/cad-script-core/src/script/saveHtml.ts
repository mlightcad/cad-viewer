import type { CadSession } from '../session/CadSession'
import type { ToolResultSavedFile } from '../tools/types'
import {
  deliverSavedFileBytes,
  toSavedFileSummary
} from './deliverSavedFile'

/** Options for `cad.file.saveHtml`. A string is treated as `path`. */
export type CadScriptHtmlSaveOptions =
  | string
  | {
      /** File path. MCP writes this path; the in-app agent uses the base name. */
      path?: string
      /** Download name when `path` is omitted. Extension follows `exportFormat`. */
      fileName?: string
      /** `'single'` HTML (default) or `'multi'` package zip. */
      exportFormat?: 'single' | 'multi'
      /** When `true` (default), include paper-space layouts. */
      exportLayouts?: boolean
      /** Canvas background: `'black'`, `'white'`, or `'space'` (per layout). */
      background?: 'black' | 'white' | 'space'
    }

/** Queued `cad.file.saveHtml` call. Bytes are produced after the script returns. */
export interface CadScriptHtmlSaveRequest {
  path?: string
  fileName: string
  exportFormat: 'single' | 'multi'
  exportLayouts: boolean
  background: 'black' | 'white' | 'space'
}

/** Options passed to {@link CadSession.exportHtml}. */
export interface CadScriptHtmlExportOptions {
  exportFormat?: 'single' | 'multi'
  exportLayouts?: boolean
  background?: 'black' | 'white' | 'space'
  title?: string
}

/** Bytes returned by a host that can build offline HTML. */
export interface CadScriptHtmlExportResult {
  /** Suggested download / disk name including extension. */
  fileName: string
  /** File body. */
  bytes: Uint8Array
  /** IANA media type (`text/html` or `application/zip`). */
  mediaType: string
}

/**
 * Normalizes a `cad.file.saveHtml` argument into a file name, path, and options.
 */
export function normalizeHtmlSaveRequest(
  docTitle: string,
  options?: CadScriptHtmlSaveOptions
): CadScriptHtmlSaveRequest {
  let requestedPath: string | undefined
  let requestedName: string | undefined
  let exportFormat: 'single' | 'multi' = 'single'
  let exportLayouts = true
  let background: 'black' | 'white' | 'space' = 'space'

  if (typeof options === 'string') {
    requestedPath = options.trim() || undefined
  } else if (options != null) {
    if (typeof options !== 'object') {
      throw new Error(
        'cad.file.saveHtml expects a path string or { path?, fileName?, ... }'
      )
    }
    if (options.path !== undefined && typeof options.path !== 'string') {
      throw new Error('cad.file.saveHtml path must be a string')
    }
    if (
      options.fileName !== undefined &&
      typeof options.fileName !== 'string'
    ) {
      throw new Error('cad.file.saveHtml fileName must be a string')
    }
    requestedPath = options.path?.trim() || undefined
    requestedName = options.fileName?.trim() || undefined
    if (options.exportFormat === 'multi') exportFormat = 'multi'
    if (options.exportLayouts === false) exportLayouts = false
    if (
      options.background === 'black' ||
      options.background === 'white' ||
      options.background === 'space'
    ) {
      background = options.background
    }
  }

  const extension = exportFormat === 'multi' ? '.zip' : '.html'
  const fromPath = requestedPath
    ? requestedPath.split(/[/\\]/).filter(Boolean).pop()
    : undefined
  const fallback = `${stripExtension(docTitle) || 'drawing'}${extension}`
  const rawName = requestedName || fromPath || fallback
  const fileName = ensureExtension(rawName, extension)

  let pathOut = requestedPath
  if (pathOut && /[/\\]$/.test(pathOut)) {
    pathOut = `${pathOut}${fileName}`
  } else if (pathOut && !hasExtension(pathOut, extension)) {
    pathOut = `${stripExtension(pathOut)}${extension}`
  }

  return pathOut
    ? {
        path: pathOut,
        fileName,
        exportFormat,
        exportLayouts,
        background
      }
    : { fileName, exportFormat, exportLayouts, background }
}

/**
 * Builds offline HTML through {@link CadSession.exportHtml} and delivers bytes.
 *
 * When the session has no `exportHtml` hook, requests are skipped and a note is
 * written to `log` (same pattern as `capturePreview` without a renderer).
 */
export async function fulfillHtmlSaveRequests(
  session: CadSession,
  docTitle: string,
  requests: readonly CadScriptHtmlSaveRequest[],
  log: string[]
): Promise<ToolResultSavedFile[]> {
  if (!requests.length) return []

  if (typeof session.exportHtml !== 'function') {
    log.push(
      'saveHtml skipped: this session has no HTML exporter (needs a viewer host)'
    )
    return []
  }

  const saved: ToolResultSavedFile[] = []
  for (const request of requests) {
    try {
      const result = await session.exportHtml({
        exportFormat: request.exportFormat,
        exportLayouts: request.exportLayouts,
        background: request.background,
        // Prefer the script-requested name so savedFiles matches the path.
        title:
          stripExtension(request.fileName) ||
          stripExtension(docTitle) ||
          'drawing'
      })
      const deliveryTarget = {
        path: request.path,
        fileName: request.fileName
      }
      const delivery = deliverSavedFileBytes(
        deliveryTarget,
        result.bytes,
        result.mediaType
      )
      saved.push(
        toSavedFileSummary(deliveryTarget, result.bytes.byteLength, delivery)
      )
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      log.push(`saveHtml failed (${request.fileName}): ${reason}`)
    }
  }
  return saved
}

function stripExtension(name: string | undefined): string {
  const trimmed = name?.trim() || ''
  return trimmed.replace(/\.[^.]+$/, '')
}

function hasExtension(name: string, extension: string): boolean {
  return name.toLowerCase().endsWith(extension)
}

function ensureExtension(name: string, extension: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith(extension)) return name
  if (lower.endsWith('.html') || lower.endsWith('.zip')) {
    return `${stripExtension(name)}${extension}`
  }
  return `${name}${extension}`
}
