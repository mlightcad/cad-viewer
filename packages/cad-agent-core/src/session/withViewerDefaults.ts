import type { CadSession } from '@mlightcad/cad-script-core'
import { acapRunDatabaseEdit } from '@mlightcad/cad-simple-viewer'
import type { AcDbDatabase } from '@mlightcad/data-model'

import { exportDrawingHtml } from '../export/exportDrawingHtml'
import { exportDrawingPdf } from '../export/exportDrawingPdf'
import { captureDrawingPreview } from '../preview/captureDrawingPreview'

/**
 * Viewer implementation of {@link CadSession.runEdit}: one undo mark plus the
 * UI notifications (undo stack, committed edit) the editor listens for.
 */
export function viewerRunEdit(
  database: AcDbDatabase,
  label: string,
  fn: () => void
): void {
  acapRunDatabaseEdit(database, label, fn)
}

/**
 * Fills in the viewer hooks a session leaves out.
 *
 * Before the runtime moved to `@mlightcad/cad-script-core`, every session used
 * `acapRunDatabaseEdit` and {@link captureDrawingPreview}. The wrappers in this
 * package call this so custom sessions keep that behavior.
 *
 * Only absent keys are filled. A session that declares a hook, even as
 * `undefined`, keeps its choice: `createDatabaseSession` uses this so a
 * headless database never gets the live viewer's screenshots, exporters, or
 * UI events.
 *
 * @param session - Session supplied by the caller.
 * @returns `session` itself when every hook key is declared; otherwise a
 *   session that delegates to it and adds the missing hooks.
 */
export function withViewerDefaults(session: CadSession): CadSession {
  const hasRunEdit = 'runEdit' in session
  const hasCapturePreview = 'capturePreview' in session
  const hasExportPdf = 'exportPdf' in session
  const hasExportHtml = 'exportHtml' in session
  if (hasRunEdit && hasCapturePreview && hasExportPdf && hasExportHtml) {
    return session
  }
  return {
    getDocument: () => session.getDocument(),
    getView: () => session.getView(),
    runEdit: hasRunEdit ? session.runEdit?.bind(session) : viewerRunEdit,
    capturePreview: hasCapturePreview
      ? session.capturePreview?.bind(session)
      : longSide => captureDrawingPreview(longSide),
    exportPdf: hasExportPdf
      ? session.exportPdf?.bind(session)
      : options => exportDrawingPdf(options),
    exportHtml: hasExportHtml
      ? session.exportHtml?.bind(session)
      : options => exportDrawingHtml(options)
  }
}
