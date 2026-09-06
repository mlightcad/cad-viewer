import { AcGeBox2d } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'
import { acapNotifyUndoStackChanged } from '../../util/AcApDatabaseEdit'
import type { AcTrView2d } from '../../view'
import {
  expandMarkupBoundsByClientRects,
  isAttachableShapeMarkup,
  markupGeometryBounds
} from './AcApMarkupGeometry'
import {
  getMarkupHistory,
  getSessionUndo,
  runMarkupEdit
} from './AcApMarkupHistory'
import { registerMarkupPublish } from './AcApMarkupRepublish'
import { getActiveMarkupBag } from './AcApMarkupSession'
import {
  getMarkupStore,
  MARKUP_LAYER,
  MARKUP_LIVE_LAYER
} from './AcApMarkupStore'
import type {
  AcApMarkupAttachedCallout,
  AcApMarkupRecord
} from './AcApMarkupTypes'
import { patchMarkupStyleWcs, withMarkupStyleWcs } from './AcApMarkupUtil'
import { createMarkupEntityFromRecord } from './entity'

// Re-export shape builders for commands / jigs that imported them from here.
export {
  markupCloudVertices,
  markupRectCorners,
  strokeMarkupCloud,
  tessellateMarkupCloud,
  buildMarkupCloud,
  buildMarkupRect
} from './AcApMarkupShapeBuilder'

function asView2d(view: AcEdBaseView): AcTrView2d {
  return view as AcTrView2d
}

/**
 * Maps markup records to HTML overlay visuals and keeps them in sync
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

    const entity = createMarkupEntityFromRecord(record)
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

  /**
   * Zoom to the combined world AABB of a markup: shape, leader, and published
   * HTML overlays (text box / badge / stamp).
   */
  focus(view: AcEdBaseView, record: AcApMarkupRecord): void {
    const box = markupFocusExtents(view, record)
    if (!box) return
    asView2d(view).zoomTo(box, 1.5)
    this.select(view, record.id)
  }
}

/**
 * Combined zoom-to box for a markup: control geometry plus HTML text boxes.
 *
 * Grip dots are omitted; they sit on geometry already included in the AABB.
 *
 * @param view - View used for overlay lookup and client → world conversion.
 * @param record - Markup whose shape, leader, and overlays are framed.
 * @returns World AABB, or `undefined` when the markup has no finite bounds.
 */
export function markupFocusExtents(
  view: AcEdBaseView,
  record: AcApMarkupRecord
): AcGeBox2d | undefined {
  const geometryBox = markupGeometryBounds(record.geometry)
  const box = geometryBox
    ? new AcGeBox2d(geometryBox.min, geometryBox.max)
    : new AcGeBox2d()
  const group = asView2d(view).htmlTransientManager.getGroup(record.id)
  if (group) {
    const rects = []
    for (const child of group.children) {
      const el = child.element
      if (
        el.classList.contains('ml-html-dot') ||
        el.classList.contains('ml-html-grip')
      ) {
        continue
      }
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 && rect.height <= 0) continue
      rects.push(rect)
    }
    expandMarkupBoundsByClientRects(box, rects, (clientX, clientY) => {
      const canvas = view.viewportToCanvas({ x: clientX, y: clientY })
      return view.screenToWorld(canvas)
    })
  }
  return box.isEmpty() ? undefined : box
}

/** Shared presenter for the active viewer session. */
export function getMarkupPresenter(): AcApMarkupPresenter {
  return getActiveMarkupBag().presenter
}

registerMarkupPublish((view, record) => {
  getMarkupPresenter().publish(view, record)
})

/**
 * Reset markup store, visuals tracking, and undo history for the active drawing.
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
    const enriched = {
      ...record,
      style: withMarkupStyleWcs(record.style, asView2d(view))
    }
    getMarkupStore().upsert(enriched)
    getMarkupPresenter().publish(view, enriched)
  })
}

/**
 * Attach a leader + text box to an existing cloud / rect / circle that has none.
 *
 * @returns true when the record was updated.
 */
export function attachCalloutToMarkup(
  view: AcEdBaseView,
  recordId: string,
  callout: AcApMarkupAttachedCallout
): boolean {
  const store = getMarkupStore()
  const existing = store.get(recordId)
  if (!existing || !isAttachableShapeMarkup(existing.geometry)) return false
  runMarkupEdit(view, 'Attach Callout', () => {
    const current = store.get(recordId)
    if (!current || !isAttachableShapeMarkup(current.geometry)) return
    const updated: AcApMarkupRecord = {
      ...current,
      text: callout.text,
      geometry: { ...current.geometry, callout },
      updatedAt: new Date().toISOString()
    }
    store.upsert(updated)
    getMarkupPresenter().publish(view, updated)
  })
  return true
}

/**
 * Apply a style patch to the selected markup and republish it.
 */
export function applyMarkupStyleToSelection(
  view: AcEdBaseView,
  patch: Partial<
    Pick<
      AcApMarkupRecord['style'],
      'color' | 'fontSize' | 'textHeightMode' | 'textHeightWcs'
    >
  >
): void {
  const store = getMarkupStore()
  const id = store.selectedId
  if (!id) return
  runMarkupEdit(view, 'Markup Style', () => {
    const previous = store.get(id)
    if (!previous) return
    const updated = store.updateStyle(id, patch)
    if (!updated) return
    const enriched = {
      ...updated,
      style: patchMarkupStyleWcs(
        previous.style,
        updated.style,
        asView2d(view),
        patch
      )
    }
    store.upsert(enriched)
    getMarkupPresenter().publish(view, enriched)
  })
}
