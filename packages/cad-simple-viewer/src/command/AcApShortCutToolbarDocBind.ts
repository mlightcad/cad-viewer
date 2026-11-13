/**
 * Wires {@link AcUiShortCutToolbar} to DocManager undo/selection state.
 *
 * Kept separate from the UI module so the offline HTML viewer-runtime can
 * import {@link AcUiShortCutToolbar} without pulling DocManager / markup /
 * measure into the IIFE.
 *
 * @module AcApShortCutToolbarDocBind
 * @packageDocumentation
 */

import { AcApDocManager } from '../app/AcApDocManager'
import { eventBus } from '../editor/global/eventBus'
import type { AcEdBaseView } from '../editor/view/AcEdBaseView'
import { AcEdOpenMode } from '../editor/view/AcEdOpenMode'
import type {
  AcUiShortCutToolbar,
  AcUiShortCutToolbarActionState
} from '../ui/AcUiShortCutToolbar'
import { getSessionUndo, runMarkupEdit } from './markup/AcApMarkupHistory'
import { getMarkupStore } from './markup/AcApMarkupStore'
import { runMeasurementEdit } from './measure/AcApMeasurementHistory'
import {
  MEASUREMENT_LAYER,
  subscribeMeasurementSelection
} from './measure/AcApMeasurementStore'

/**
 * Binds document undo stack, selection, and default command actions to a
 * shortcut toolbar. Safe to call after DocManager construction completes.
 *
 * @param toolbar - Toolbar created for a view container.
 * @returns Cleanup that removes listeners.
 */
export function acapBindShortCutToolbarDocState(
  toolbar: AcUiShortCutToolbar
): () => void {
  let unbindViewSelection: (() => void) | null = null

  const resolveActionState = (): AcUiShortCutToolbarActionState => {
    const dm = AcApDocManager.tryGetInstance()
    if (!dm) {
      return {
        undo: false,
        redo: false,
        erase: false,
        copy: false,
        cut: false,
        paste: false,
        showClipboard: false
      }
    }
    const doc = dm.curDocument
    const view = dm.curView
    const db = doc?.database
    const isWriteMode =
      (doc?.openMode ?? AcEdOpenMode.Read) >= AcEdOpenMode.Write
    const canUndo = db != null ? getSessionUndo().canUndo(db) : false
    const canRedo = db != null ? getSessionUndo().canRedo(db) : false
    const canErase = Boolean(
      view &&
        (view.selectionSet.count > 0 ||
          view.htmlTransientManager.hasSelection())
    )
    // COPYCLIP / CUTCLIP only act on drawing entities, not markup or
    // measurement overlays, so they follow the CAD selection set alone.
    const hasEntitySelection = Boolean(view && view.selectionSet.count > 0)
    return {
      undo: canUndo,
      redo: canRedo,
      erase: canErase,
      copy: hasEntitySelection,
      cut: hasEntitySelection,
      paste: db != null,
      // Clipboard chrome is Write-only (CUTCLIP / PASTECLIP require Write;
      // COPYCLIP is hidden with them so the bar stays consistent).
      showClipboard: isWriteMode
    }
  }

  const runErase = () => {
    const dm = AcApDocManager.tryGetInstance()
    if (!dm) return
    const view = dm.curView
    if (view && !view.editor.isActive) {
      let removed = false
      const ht = view.htmlTransientManager
      if (ht.hasSelection()) {
        const selected = ht.getSelectedGroups()
        const measurements = selected.filter(
          group => group.layer === MEASUREMENT_LAYER
        )
        if (measurements.length > 0) {
          runMeasurementEdit(view, 'Delete Measurement', () => {
            for (const group of measurements) {
              if (ht.detach(group.id)) removed = true
            }
          })
        }
        const hasMarkupSelection =
          selected.some(group => group.layer !== MEASUREMENT_LAYER) ||
          (selected.length === 0 && ht.hasSelection())
        if (hasMarkupSelection) {
          runMarkupEdit(view, 'Delete Markup', () => {
            removed = ht.deleteSelected() || removed
          })
        }
      }
      if (removed) {
        view.isHtmlDirty = true
        toolbar.syncActionState()
        return
      }
    }
    dm.sendStringToExecute('erase')
  }

  const bindViewSelection = (view: AcEdBaseView | null | undefined) => {
    unbindViewSelection?.()
    unbindViewSelection = null
    if (!view) return
    const onSelectionChanged = () => toolbar.syncActionState()
    const { selectionSet } = view
    selectionSet.events.selectionAdded.addEventListener(onSelectionChanged)
    selectionSet.events.selectionRemoved.addEventListener(onSelectionChanged)
    unbindViewSelection = () => {
      selectionSet.events.selectionAdded.removeEventListener(onSelectionChanged)
      selectionSet.events.selectionRemoved.removeEventListener(
        onSelectionChanged
      )
    }
  }

  const onUndoStackChanged = () => toolbar.syncActionState()
  const onDocumentActivated = () => {
    const dm = AcApDocManager.tryGetInstance()
    if (!dm) return
    bindViewSelection(dm.curView)
    toolbar.syncActionState()
  }
  const onSelectionChanged = () => toolbar.syncActionState()

  toolbar.setActions({
    undo: () => AcApDocManager.instance.sendStringToExecute('undo'),
    redo: () => AcApDocManager.instance.sendStringToExecute('redo'),
    erase: runErase,
    copy: () => AcApDocManager.instance.sendStringToExecute('copyclip'),
    cut: () => AcApDocManager.instance.sendStringToExecute('cutclip'),
    paste: () => AcApDocManager.instance.sendStringToExecute('pasteclip')
  })
  toolbar.setActionStateProvider(resolveActionState)

  const attachDocManager = (attempt = 0) => {
    const dm = AcApDocManager.tryGetInstance()
    if (!dm) {
      // Created mid-constructor: retry briefly until the singleton is assigned.
      // Cap retries so hosts without DocManager never spin forever.
      if (attempt < 20) queueMicrotask(() => attachDocManager(attempt + 1))
      return
    }
    dm.events.documentActivated.addEventListener(onDocumentActivated)
    bindViewSelection(dm.curView)
    toolbar.syncActionState()
  }

  eventBus.on('undo-stack-changed', onUndoStackChanged)
  const offMarkup = getMarkupStore().subscribe(onSelectionChanged)
  const offMeasure = subscribeMeasurementSelection(onSelectionChanged)
  attachDocManager()

  return () => {
    eventBus.off('undo-stack-changed', onUndoStackChanged)
    offMarkup()
    offMeasure()
    unbindViewSelection?.()
    const dm = AcApDocManager.tryGetInstance()
    dm?.events.documentActivated.removeEventListener(onDocumentActivated)
    toolbar.setActionStateProvider(undefined)
  }
}
