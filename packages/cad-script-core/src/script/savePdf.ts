import { acexPdfExportDatabase } from '@mlightcad/cad-pdf-core'
import type { AcDbDatabase } from '@mlightcad/data-model'

import type { CadSession } from '../session/CadSession'
import type { ToolResultSavedFile } from '../tools/types'
import {
  deliverSavedFileBytes,
  toSavedFileSummary
} from './deliverSavedFile'

/** Options for `cad.file.savePdf`. A string is treated as `path`. */
export type CadScriptPdfSaveOptions =
  | string
  | {
      /** File path. MCP writes this path; the in-app agent uses the base name. */
      path?: string
      /** Download name when `path` is omitted. `.pdf` is appended when missing. */
      fileName?: string
      /** When `true` (default), every layout becomes a PDF page. */
      exportLayouts?: boolean
      /** `'color'` (default) or `'monochrome'`. */
      colorMode?: 'color' | 'monochrome'
      /** `'text'` (default) or `'vector'`. */
      textMode?: 'text' | 'vector'
      /**
       * Model-space framing. `'extents'` (default) or `'display'`.
       * `'display'` needs a host that supplies a fit box via `exportPdf`.
       */
      modelSpaceFit?: 'extents' | 'display'
    }

/** Queued `cad.file.savePdf` call. Bytes are produced after the script returns. */
export interface CadScriptPdfSaveRequest {
  path?: string
  fileName: string
  exportLayouts: boolean
  colorMode: 'color' | 'monochrome'
  textMode: 'text' | 'vector'
  modelSpaceFit: 'extents' | 'display'
}

/** Options passed to {@link CadSession.exportPdf}. */
export interface CadScriptPdfExportOptions {
  exportLayouts?: boolean
  colorMode?: 'color' | 'monochrome'
  textMode?: 'text' | 'vector'
  modelSpaceFit?: 'extents' | 'display'
  title?: string
}

/**
 * Normalizes a `cad.file.savePdf` argument into a file name, path, and options.
 */
export function normalizePdfSaveRequest(
  docTitle: string,
  options?: CadScriptPdfSaveOptions
): CadScriptPdfSaveRequest {
  let requestedPath: string | undefined
  let requestedName: string | undefined
  let exportLayouts = true
  let colorMode: 'color' | 'monochrome' = 'color'
  let textMode: 'text' | 'vector' = 'text'
  let modelSpaceFit: 'extents' | 'display' = 'extents'

  if (typeof options === 'string') {
    requestedPath = options.trim() || undefined
  } else if (options != null) {
    if (typeof options !== 'object') {
      throw new Error(
        'cad.file.savePdf expects a path string or { path?, fileName?, ... }'
      )
    }
    if (options.path !== undefined && typeof options.path !== 'string') {
      throw new Error('cad.file.savePdf path must be a string')
    }
    if (
      options.fileName !== undefined &&
      typeof options.fileName !== 'string'
    ) {
      throw new Error('cad.file.savePdf fileName must be a string')
    }
    requestedPath = options.path?.trim() || undefined
    requestedName = options.fileName?.trim() || undefined
    if (options.exportLayouts === false) exportLayouts = false
    if (options.colorMode === 'monochrome') colorMode = 'monochrome'
    if (options.textMode === 'vector') textMode = 'vector'
    if (options.modelSpaceFit === 'display') modelSpaceFit = 'display'
  }

  const fromPath = requestedPath
    ? requestedPath.split(/[/\\]/).filter(Boolean).pop()
    : undefined
  const fallback = `${stripExtension(docTitle) || 'drawing'}.pdf`
  const rawName = requestedName || fromPath || fallback
  const fileName = rawName.toLowerCase().endsWith('.pdf')
    ? rawName
    : `${rawName}.pdf`

  let pathOut = requestedPath
  if (pathOut && /[/\\]$/.test(pathOut)) {
    pathOut = `${pathOut}${fileName}`
  } else if (pathOut && !pathOut.toLowerCase().endsWith('.pdf')) {
    pathOut = `${pathOut}.pdf`
  }

  return pathOut
    ? {
        path: pathOut,
        fileName,
        exportLayouts,
        colorMode,
        textMode,
        modelSpaceFit
      }
    : { fileName, exportLayouts, colorMode, textMode, modelSpaceFit }
}

/**
 * Renders the drawing to PDF and hands bytes to the current host.
 *
 * Prefers {@link CadSession.exportPdf} when it is a function (viewer fonts).
 * Otherwise uses `@mlightcad/cad-pdf-core` `acexPdfExportDatabase`.
 *
 * Per-request failures are logged and skipped so a successful script is not
 * marked failed after edits already committed.
 */
export async function fulfillPdfSaveRequests(
  session: CadSession,
  database: AcDbDatabase,
  docTitle: string,
  requests: readonly CadScriptPdfSaveRequest[],
  log: string[]
): Promise<ToolResultSavedFile[]> {
  if (!requests.length) return []

  const saved: ToolResultSavedFile[] = []
  for (const request of requests) {
    try {
      const exportOptions: CadScriptPdfExportOptions = {
        exportLayouts: request.exportLayouts,
        colorMode: request.colorMode,
        textMode: request.textMode,
        modelSpaceFit: request.modelSpaceFit,
        title: stripExtension(request.fileName) || stripExtension(docTitle) || 'drawing'
      }
      const bytes =
        typeof session.exportPdf === 'function'
          ? await session.exportPdf(exportOptions)
          : await acexPdfExportDatabase(database, {
              exportLayouts: exportOptions.exportLayouts,
              colorMode: exportOptions.colorMode,
              textMode: exportOptions.textMode,
              // Without a display fit box, extents framing is the only safe
              // headless default.
              modelSpaceFit:
                exportOptions.modelSpaceFit === 'display'
                  ? 'extents'
                  : exportOptions.modelSpaceFit,
              title: exportOptions.title
            })
      const delivery = deliverSavedFileBytes(
        request,
        bytes,
        'application/pdf'
      )
      saved.push(toSavedFileSummary(request, bytes.byteLength, delivery))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      log.push(`savePdf failed (${request.fileName}): ${reason}`)
    }
  }
  return saved
}

function stripExtension(name: string | undefined): string {
  const trimmed = name?.trim() || ''
  return trimmed.replace(/\.[^.]+$/, '')
}
