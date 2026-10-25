import type { AcDbDatabase } from '@mlightcad/data-model'

import type { ToolResultSavedFile } from '../tools/types'
import { CAD_MCP_DXF_OUTBOX_KEY } from './scriptApi'

/** Options for `cad.file.saveDxf`. A string is treated as `path`. */
export type CadScriptDxfSaveOptions =
  | string
  | {
      /** File path. MCP writes this path; the in-app agent uses the base name as the download. */
      path?: string
      /** Download name when `path` is omitted. `.dxf` is appended when missing. */
      fileName?: string
    }

/** Queued `cad.file.saveDxf` call. The DXF body is produced after the script returns. */
export interface CadScriptDxfSaveRequest {
  path?: string
  fileName: string
}

interface DxfOutboxItem {
  path?: string
  fileName: string
  text: string
}

/**
 * Normalizes a `cad.file.saveDxf` argument into a file name and optional path.
 *
 * @param docTitle - Current drawing title, used when no name is given.
 * @param options - Path string or `{ path?, fileName? }`.
 */
export function normalizeDxfSaveRequest(
  docTitle: string,
  options?: CadScriptDxfSaveOptions
): CadScriptDxfSaveRequest {
  let requestedPath: string | undefined
  let requestedName: string | undefined

  if (typeof options === 'string') {
    requestedPath = options.trim() || undefined
  } else if (options != null) {
    if (typeof options !== 'object') {
      throw new Error(
        'cad.file.saveDxf expects a path string or { path?, fileName? }'
      )
    }
    if (options.path !== undefined && typeof options.path !== 'string') {
      throw new Error('cad.file.saveDxf path must be a string')
    }
    if (
      options.fileName !== undefined &&
      typeof options.fileName !== 'string'
    ) {
      throw new Error('cad.file.saveDxf fileName must be a string')
    }
    requestedPath = options.path?.trim() || undefined
    requestedName = options.fileName?.trim() || undefined
  }

  const fromPath = requestedPath
    ? requestedPath.split(/[/\\]/).filter(Boolean).pop()
    : undefined
  const fallback = `${stripExtension(docTitle) || 'drawing'}.dxf`
  const rawName = requestedName || fromPath || fallback
  const fileName = rawName.toLowerCase().endsWith('.dxf')
    ? rawName
    : `${rawName}.dxf`

  let pathOut = requestedPath
  if (pathOut && /[/\\]$/.test(pathOut)) {
    pathOut = `${pathOut}${fileName}`
  } else if (pathOut && !pathOut.toLowerCase().endsWith('.dxf')) {
    pathOut = `${pathOut}.dxf`
  }

  return pathOut ? { path: pathOut, fileName } : { fileName }
}

/**
 * Serializes the drawing and hands the DXF to the current host.
 *
 * The MCP runner stashes the text on `window` for Node to write. The in-app
 * agent (and the script panel) starts a browser download. The DXF body is
 * never placed on the tool result.
 *
 * @param database - Drawing to export.
 * @param requests - Saves queued by the script.
 * @returns Summaries safe to return to the model.
 */
export function fulfillDxfSaveRequests(
  database: AcDbDatabase,
  requests: readonly CadScriptDxfSaveRequest[]
): ToolResultSavedFile[] {
  if (!requests.length) return []

  const saved: ToolResultSavedFile[] = []
  for (const request of requests) {
    const raw = database.dxfOut(undefined, 6)
    const text = dxfToText(raw)
    const bytes = utf8ByteLength(text)
    const delivery = deliverDxf(request, text)
    saved.push({
      fileName: request.fileName,
      path: request.path ?? request.fileName,
      bytes,
      delivery
    })
  }
  return saved
}

function deliverDxf(
  request: CadScriptDxfSaveRequest,
  text: string
): ToolResultSavedFile['delivery'] {
  const host = globalThis as unknown as Record<string, unknown>
  if (host.__cadMcp) {
    const box = (host[CAD_MCP_DXF_OUTBOX_KEY] as DxfOutboxItem[] | undefined) ?? []
    box.push({
      path: request.path,
      fileName: request.fileName,
      text
    })
    host[CAD_MCP_DXF_OUTBOX_KEY] = box
    return 'mcp'
  }

  const doc = (globalThis as { document?: Document }).document
  if (doc && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    downloadDxf(doc, request.fileName, text)
    return 'download'
  }

  return 'none'
}

function downloadDxf(doc: Document, fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'application/dxf;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = doc.createElement('a')
  link.href = url
  link.download = fileName
  doc.body.appendChild(link)
  link.click()
  doc.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function dxfToText(value: string | Uint8Array): string {
  if (typeof value === 'string') return value
  return new TextDecoder().decode(value)
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

function stripExtension(name: string | undefined): string {
  const trimmed = name?.trim() || ''
  return trimmed.replace(/\.[^.]+$/, '')
}
