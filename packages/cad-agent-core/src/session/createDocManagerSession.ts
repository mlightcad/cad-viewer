import type {
  CadSession,
  CadSessionDocument,
  CadSessionView
} from '@mlightcad/cad-script-core'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import { captureDrawingPreview } from '../preview/captureDrawingPreview'
import { viewerRunEdit } from './withViewerDefaults'

/**
 * Session that reads {@link AcApDocManager.instance} on every call.
 *
 * Besides document and view access it wires the viewer-only hooks:
 * edits notify the UI through `acapRunDatabaseEdit`, and
 * `cad.view.capturePreview` renders through {@link captureDrawingPreview}.
 * PDF/HTML export hooks are filled by {@link withViewerDefaults} when the
 * catalog or `executeCadScript` wrappers run.
 *
 * Used by the in-page agent plugin, the script console, and the MCP runner
 * page. Without a viewer, use `createDatabaseSession` from
 * `@mlightcad/cad-script-core` instead.
 *
 * @returns A session bound to the viewer singleton.
 */
export function createDocManagerSession(): CadSession {
  return {
    getDocument(): CadSessionDocument | undefined {
      try {
        const doc = AcApDocManager.instance?.curDocument
        if (!doc?.database) return undefined
        return doc
      } catch {
        return undefined
      }
    },
    getView(): CadSessionView | undefined {
      try {
        const manager = AcApDocManager.instance
        const view = manager?.curView ?? manager?.context?.view
        return view
      } catch {
        return undefined
      }
    },
    runEdit: viewerRunEdit,
    capturePreview: longSide => captureDrawingPreview(longSide)
  }
}
