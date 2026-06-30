import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import type { ToolResult } from './CadActionExecutor'

/**
 * Verifies that an active drawing is available for agent tools.
 *
 * @param requireWrite - When true, rejects read-only documents.
 * @returns A failed {@link ToolResult} when access is unavailable; otherwise `undefined`.
 */
export function requireDocument(requireWrite = false): ToolResult | undefined {
  try {
    const doc = AcApDocManager.instance?.curDocument
    if (!doc?.database) {
      return {
        success: false,
        message: 'No drawing is available. Open or create a drawing first.',
        error: 'no_document'
      }
    }

    if (requireWrite && doc.openMode !== AcEdOpenMode.Write) {
      return {
        success: false,
        message: 'The drawing is open in read-only mode.',
        error: 'read_only'
      }
    }

    return undefined
  } catch {
    return {
      success: false,
      message: 'No drawing is available. Open or create a drawing first.',
      error: 'no_document'
    }
  }
}

/**
 * Verifies that the active drawing view is available for zoom operations.
 *
 * @returns A failed {@link ToolResult} when the view is unavailable; otherwise `undefined`.
 */
export function requireView(): ToolResult | undefined {
  const documentError = requireDocument(false)
  if (documentError) {
    return documentError
  }

  try {
    if (!AcApDocManager.instance.context?.view) {
      return {
        success: false,
        message: 'Drawing view is not available.',
        error: 'no_view'
      }
    }
    return undefined
  } catch {
    return {
      success: false,
      message: 'Drawing view is not available.',
      error: 'no_view'
    }
  }
}
