import type { ToolResultSavedFile } from '../tools/types'
import { CAD_MCP_FILE_OUTBOX_KEY } from './scriptApi'

/** Payload stashed for the MCP Node host to write to disk. */
export interface CadMcpFileOutboxItem {
  path?: string
  fileName: string
  mediaType: string
  /** Base64-encoded file body (binary-safe across Playwright evaluate). */
  bytesBase64: string
}

/**
 * Hands file bytes to the current host without returning the body to the model.
 *
 * MCP stashes base64 on `window` for Node to write. The in-app agent starts a
 * browser download. Tests without either host get `none`.
 */
export function deliverSavedFileBytes(
  request: { path?: string; fileName: string },
  bytes: Uint8Array,
  mediaType: string
): ToolResultSavedFile['delivery'] {
  const host = globalThis as unknown as Record<string, unknown>
  if (host.__cadMcp) {
    const box =
      (host[CAD_MCP_FILE_OUTBOX_KEY] as CadMcpFileOutboxItem[] | undefined) ??
      []
    box.push({
      path: request.path,
      fileName: request.fileName,
      mediaType,
      bytesBase64: bytesToBase64(bytes)
    })
    host[CAD_MCP_FILE_OUTBOX_KEY] = box
    return 'mcp'
  }

  const doc = (globalThis as { document?: Document }).document
  if (
    doc &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    downloadBytes(doc, request.fileName, bytes, mediaType)
    return 'download'
  }

  return 'none'
}

/**
 * Builds a {@link ToolResultSavedFile} summary for a delivered payload.
 */
export function toSavedFileSummary(
  request: { path?: string; fileName: string },
  bytes: number,
  delivery: ToolResultSavedFile['delivery']
): ToolResultSavedFile {
  return {
    fileName: request.fileName,
    path: request.path ?? request.fileName,
    bytes,
    delivery
  }
}

function downloadBytes(
  doc: Document,
  fileName: string,
  bytes: Uint8Array,
  mediaType: string
): void {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: mediaType })
  const url = URL.createObjectURL(blob)
  const link = doc.createElement('a')
  link.href = url
  link.download = fileName
  doc.body.appendChild(link)
  link.click()
  doc.body.removeChild(link)
  // Delay revoke so the browser can start the download (large PDF/HTML).
  const revoke = globalThis.setTimeout?.bind(globalThis) ?? setTimeout
  revoke(() => URL.revokeObjectURL(url), 60_000)
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
