import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import type { ToolResult } from '../tools/types'
import type { CadSession } from './CadSession'

/**
 * Verifies that the session has an active drawing.
 *
 * @param session - Document and view access for this call.
 * @param requireWrite - When true, rejects read-only documents.
 * @returns A failed {@link ToolResult} when access is unavailable; otherwise `undefined`.
 */
export function requireDocument(
  session: CadSession,
  requireWrite = false
): ToolResult | undefined {
  try {
    const doc = session.getDocument()
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
 * Verifies that the active drawing view is available.
 *
 * @param session - Document and view access for this call.
 * @returns A failed {@link ToolResult} when the view is unavailable; otherwise `undefined`.
 */
export function requireView(session: CadSession): ToolResult | undefined {
  const documentError = requireDocument(session, false)
  if (documentError) {
    return documentError
  }

  try {
    if (!session.getView()) {
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
