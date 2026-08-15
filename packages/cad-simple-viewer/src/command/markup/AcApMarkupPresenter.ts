import { AcGeBox2d, type AcGePoint3dLike } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'
import { acapNotifyUndoStackChanged } from '../../util/AcApDatabaseEdit'
import type { AcTrView2d } from '../../view'
import {
  getMarkupHistory,
  getSessionUndo,
  runMarkupEdit
} from './AcApMarkupHistory'
import { registerMarkupPublish } from './AcApMarkupRepublish'
import {
  getMarkupStore,
  MARKUP_LAYER,
  MARKUP_LIVE_LAYER
} from './AcApMarkupStore'
import type { AcApMarkupRecord } from './AcApMarkupTypes'
import { createMarkupEntity } from './entity'

// Re-export shape builders for commands / jigs that imported them from here.
export { buildMarkupCloud, buildMarkupRect } from './AcApMarkupShapeBuilder'

function asView2d(view: AcEdBaseView): AcTrView2d {
  return view as AcTrView2d
}

/**
 * Maps markup records to HTML / CAD transient visuals and keeps them in sync
 * with {@link getMarkupStore}.
 *
 * Per-type draw / grip behavior lives on {@link AcApMarkupEntity} subclasses;
 * this class only schedules publish / unpublish / selection.
 */
export class AcApMarkupPresenter {
  private readonly published = new Set<string>()
  private suppressingStoreRemove = false

  /** Publish every record currently in the store onto the view. */
  republishAll(view: AcEdBaseView): void {
    this.clearVisuals(view, { clearStore: false })
    for (const record of getMarkupStore().list()) {
      this.publish(view, record)
    }
  }

  /**
   * Create (or replace) the visual for one record and register it in the HTML
   * transient manager.
   */
  publish(view: AcEdBaseView, record: AcApMarkupRecord): void {
    const view2d = asView2d(view)
    const restoreSelection = getMarkupStore().selectedId === record.id
    if (this.published.has(record.id)) {
      this.unpublish(view, record.id, { keepInStore: true })
    }

    const entity = createMarkupEntity(record)
    const drawn = entity.worldDraw(view2d)
    const { group, entityIds } = drawn
    const extras = {
      entityIds,
      dispose: drawn.dispose
    }

    const store = getMarkupStore()
    const prevSelectedChanged = group.onSelectedChanged
    group.onSelectedChanged = (selected, g) => {
      prevSelectedChanged?.(selected, g)
      if (selected) {
        store.setSelectedId(g.id)
        if (extras.entityIds.length > 0) view2d.highlight(extras.entityIds)
      } else {
        if (store.selectedId === g.id) store.setSelectedId(undefined)
        if (extras.entityIds.length > 0) view2d.unhighlight(extras.entityIds)
      }
    }

    const prevVisibleChanged = group.onVisibleChanged
    group.onVisibleChanged = (visible, g) => {
      prevVisibleChanged?.(visible, g)
      for (const objectId of extras.entityIds) {
        view2d.setTransientEntityVisible(objectId, visible)
      }
    }

    const prevDispose = group.onDispose
    group.onDispose = () => {
      prevDispose?.()
      if (extras.entityIds.length > 0) view2d.unhighlight(extras.entityIds)
      extras.dispose()
      this.published.delete(record.id)
      if (!this.suppressingStoreRemove) {
        store.removeRecord(record.id)
      }
    }

    view2d.htmlTransientManager.add(group)
    drawn.bindGrips?.()
    view2d.isHtmlDirty = true
    this.published.add(record.id)

    if (restoreSelection) {
      getMarkupStore().setSelectedId(record.id)
      view2d.htmlTransientManager.selectGroup(record.id)
    }
  }

  /**
   * Remove one markup visual. By default also removes the store record.
   */
  unpublish(
    view: AcEdBaseView,
    id: string,
    options?: { keepInStore?: boolean }
  ): void {
    const keepInStore = options?.keepInStore === true
    const apply = () => this.unpublishInternal(view, id, keepInStore)
    if (!keepInStore && !getMarkupHistory().isBusy) {
      runMarkupEdit(view, 'Delete Markup', apply)
      return
    }
    apply()
  }

  private unpublishInternal(
    view: AcEdBaseView,
    id: string,
    keepInStore: boolean
  ): void {
    const view2d = asView2d(view)
    this.suppressingStoreRemove = keepInStore
    try {
      if (view2d.htmlTransientManager.has(id)) {
        view2d.htmlTransientManager.remove(id)
      } else {
        this.published.delete(id)
        if (!keepInStore) getMarkupStore().removeRecord(id)
      }
    } finally {
      this.suppressingStoreRemove = false
    }
    view2d.isHtmlDirty = true
  }

  /** Clear all markup visuals (and optionally store records). */
  clearVisuals(view: AcEdBaseView, options?: { clearStore?: boolean }): void {
    const shouldClearStore = options?.clearStore !== false
    const apply = () => this.clearVisualsInternal(view, shouldClearStore)
    if (shouldClearStore && !getMarkupHistory().isBusy) {
      runMarkupEdit(view, 'Clear Markups', apply)
      return
    }
    apply()
  }

  /**
   * Clear markup visuals (and optionally store records) for one layout only.
   */
  clearLayout(
    view: AcEdBaseView,
    layoutId: string,
    options?: { clearStore?: boolean }
  ): void {
    const shouldClearStore = options?.clearStore !== false
    const apply = () => {
      const ids = getMarkupStore()
        .list()
        .filter(record => record.layoutId === layoutId)
        .map(record => record.id)
      for (const id of ids) {
        this.unpublish(view, id, { keepInStore: !shouldClearStore })
      }
      asView2d(view).isHtmlDirty = true
    }
    if (shouldClearStore && !getMarkupHistory().isBusy) {
      runMarkupEdit(view, 'Clear Markups', apply)
      return
    }
    apply()
  }

  private clearVisualsInternal(
    view: AcEdBaseView,
    shouldClearStore: boolean
  ): void {
    const view2d = asView2d(view)
    this.suppressingStoreRemove = true
    try {
      view2d.htmlTransientManager.deselectAll()
      view2d.htmlTransientManager.clear(MARKUP_LAYER)
      view2d.htmlTransientManager.clear(MARKUP_LIVE_LAYER)
      this.published.clear()
    } finally {
      this.suppressingStoreRemove = false
    }
    if (shouldClearStore) {
      getMarkupStore().clear({ markDirty: true })
    }
    view2d.isHtmlDirty = true
  }

  /** Drop published-id tracking after the view/scene was discarded. */
  forgetPublished(): void {
    this.published.clear()
  }

  /** Select the HTML group for a markup id. */
  select(view: AcEdBaseView, id: string): void {
    asView2d(view).htmlTransientManager.selectGroup(id)
    getMarkupStore().setSelectedId(id)
  }

  /** Zoom roughly to a markup's primary world point. */
  focus(view: AcEdBaseView, record: AcApMarkupRecord): void {
    const p = createMarkupEntity(record).primaryPoint() as
      | AcGePoint3dLike
      | undefined
    if (!p) return
    const view2d = asView2d(view)
    const pad = 50
    const box = new AcGeBox2d()
      .expandByPoint({ x: p.x - pad, y: p.y - pad })
      .expandByPoint({ x: p.x + pad, y: p.y + pad })
    view2d.zoomTo(box, 1.5)
    this.select(view, record.id)
  }
}

let sharedPresenter: AcApMarkupPresenter | undefined

/** Shared presenter for the active viewer session. */
export function getMarkupPresenter(): AcApMarkupPresenter {
  if (!sharedPresenter) sharedPresenter = new AcApMarkupPresenter()
  return sharedPresenter
}

registerMarkupPublish((view, record) => {
  getMarkupPresenter().publish(view, record)
})

/**
 * Reset markup store, visuals tracking, and undo history for a new drawing.
 * Call before {@link AcTrView2d.clear} so overlay dispose does not look like
 * user deletes and leftover undo cannot republish the previous drawing.
 */
export function resetMarkupSession(): void {
  getMarkupHistory().clear()
  getSessionUndo().clear()
  getMarkupStore().reset()
  getMarkupPresenter().forgetPublished()
  acapNotifyUndoStackChanged()
}

/**
 * Upsert a record into the store and publish its visual (undoable).
 */
export function commitMarkup(
  view: AcEdBaseView,
  record: AcApMarkupRecord
): void {
  runMarkupEdit(view, 'Create Markup', () => {
    getMarkupStore().upsert(record)
    getMarkupPresenter().publish(view, record)
  })
}

/**
 * Apply a style patch to the selected markup and republish it.
 */
export function applyMarkupStyleToSelection(
  view: AcEdBaseView,
  patch: Partial<AcApMarkupRecord['style']>
): void {
  const store = getMarkupStore()
  const id = store.selectedId
  if (!id) return
  runMarkupEdit(view, 'Markup Style', () => {
    const updated = store.updateStyle(id, patch)
    if (updated) getMarkupPresenter().publish(view, updated)
  })
}
