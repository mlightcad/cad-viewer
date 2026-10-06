/**
 * Wires {@link AcUiToolbar} document open / open-mode state to DocManager.
 *
 * Kept separate from the UI module so the offline HTML viewer-runtime can
 * import {@link AcUiToolbar} without pulling DocManager into the IIFE.
 *
 * @module AcApToolbarDocBind
 * @packageDocumentation
 */

import { AcApDocManager } from '../app/AcApDocManager'
import { AcEdOpenMode } from '../editor/view/AcEdOpenMode'
import type { AcUiToolbar } from '../ui/toolbar/AcUiToolbar'

/**
 * Binds document activated / opening events to a main toolbar.
 * Safe to call after DocManager construction completes.
 *
 * @param toolbar - Toolbar created for a view container.
 * @returns Cleanup that removes listeners.
 */
export function acapBindToolbarDocState(toolbar: AcUiToolbar): () => void {
  const syncFromDocument = () => {
    const dm = AcApDocManager.tryGetInstance()
    if (!dm) {
      toolbar.setDocState({
        hasDocument: false,
        isOpening: false,
        openMode: AcEdOpenMode.Read
      })
      return
    }
    const doc = dm.curDocument
    toolbar.setDocState({
      hasDocument: Boolean(doc),
      isOpening: false,
      openMode: doc?.openMode ?? AcEdOpenMode.Read
    })
  }

  const onDocumentToBeOpened = () => {
    toolbar.setDocState({ isOpening: true })
  }

  const attachDocManager = (attempt = 0) => {
    const dm = AcApDocManager.tryGetInstance()
    if (!dm) {
      // Created mid-constructor: retry briefly until the singleton is assigned.
      // Cap retries so hosts without DocManager never spin forever.
      if (attempt < 20) queueMicrotask(() => attachDocManager(attempt + 1))
      return
    }
    dm.events.documentActivated.addEventListener(syncFromDocument)
    dm.events.documentToBeOpened.addEventListener(onDocumentToBeOpened)
    syncFromDocument()
  }

  attachDocManager()

  return () => {
    const dm = AcApDocManager.tryGetInstance()
    dm?.events.documentActivated.removeEventListener(syncFromDocument)
    dm?.events.documentToBeOpened.removeEventListener(onDocumentToBeOpened)
  }
}
