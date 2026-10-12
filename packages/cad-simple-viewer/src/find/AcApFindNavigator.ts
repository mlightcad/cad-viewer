import {
  acdbHostApplicationServices,
  AcGeBox2d,
  AcGePoint2d
} from '@mlightcad/data-model'

import type { AcApDocManager } from '../app/AcApDocManager'
import { acapFindHitBox, type AcApFindLayoutHit } from './findDrawing'

/** Options for {@link acapNavigateToFindHit}. */
export interface AcApFindNavigateOptions {
  /**
   * Activate the hit's layout when it is not the active one. Default `true`.
   * When `false` a cross-layout hit is not navigated and `layout-mismatch`
   * is returned.
   */
  activateLayout?: boolean
  /** Margin passed to `zoomTo`. Default `1.1`. */
  margin?: number
  /**
   * Maximum time (ms) to wait for the freshly activated layout to finish
   * converting before zooming and selecting. Default 15000.
   */
  idleTimeoutMs?: number
  /**
   * Canvas area (CSS pixels from each edge) covered by UI such as a docked
   * palette. The hit is framed and centred in the remaining visible part of
   * the canvas so it never ends up hidden behind the palette.
   */
  insets?: AcApFindViewInsets
}

/** Pixels of the canvas covered on each side; see {@link AcApFindNavigateOptions.insets}. */
export interface AcApFindViewInsets {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

/** View methods used to keep the hit inside the uncovered canvas area. */
interface InsetView {
  width?: number
  height?: number
  center?: { x: number; y: number }
  worldToScreen?(p: { x: number; y: number }): { x: number; y: number }
  screenToWorld?(p: { x: number; y: number }): { x: number; y: number }
}

/**
 * Zooms to `box` so that it fits, centred, in the part of the canvas that
 * `insets` leaves visible. Falls back to a plain `zoomTo` when the view
 * cannot convert coordinates or the visible part is too small to matter.
 */
function zoomToVisible(
  view: InsetView & { zoomTo(box: AcGeBox2d, margin?: number): void },
  box: { min: { x: number; y: number }; max: { x: number; y: number } },
  margin: number,
  insets: AcApFindViewInsets | undefined
) {
  const width = Number(view.width) || 0
  const height = Number(view.height) || 0
  const left = Math.max(0, insets?.left ?? 0)
  const right = Math.max(0, insets?.right ?? 0)
  const top = Math.max(0, insets?.top ?? 0)
  const bottom = Math.max(0, insets?.bottom ?? 0)
  const visibleW = width - left - right
  const visibleH = height - top - bottom
  const usable =
    width > 0 &&
    height > 0 &&
    left + right + top + bottom > 0 &&
    visibleW >= width * 0.2 &&
    visibleH >= height * 0.2 &&
    !!view.worldToScreen &&
    !!view.screenToWorld
  if (!usable) {
    view.zoomTo(
      new AcGeBox2d(
        new AcGePoint2d(box.min.x, box.min.y),
        new AcGePoint2d(box.max.x, box.max.y)
      ),
      margin
    )
    return
  }
  // Grow the box so that, fitted to the full canvas, its original part
  // fits the visible part.
  const cx = (box.min.x + box.max.x) / 2
  const cy = (box.min.y + box.max.y) / 2
  const halfW = ((box.max.x - box.min.x) / 2) * (width / visibleW)
  const halfH = ((box.max.y - box.min.y) / 2) * (height / visibleH)
  view.zoomTo(
    new AcGeBox2d(
      new AcGePoint2d(cx - halfW, cy - halfH),
      new AcGePoint2d(cx + halfW, cy + halfH)
    ),
    margin
  )
  // Then pan so the hit sits in the middle of the visible part.
  const hitOnScreen = view.worldToScreen!({ x: cx, y: cy })
  const targetX = left + visibleW / 2
  const targetY = top + visibleH / 2
  const newCenter = view.screenToWorld!({
    x: width / 2 + (hitOnScreen.x - targetX),
    y: height / 2 + (hitOnScreen.y - targetY)
  })
  if (isFinite(newCenter.x) && isFinite(newCenter.y)) {
    view.center = new AcGePoint2d(newCenter.x, newCenter.y)
  }
}

/**
 * Outcome of {@link acapNavigateToFindHit}.
 *
 * - `navigated`: layout (if needed) activated, view zoomed, entity selected
 * - `layout-mismatch`: hit is in another layout and `activateLayout` is false
 * - `layout-missing`: the hit's layout no longer exists in the drawing
 * - `layout-switch-failed`: the layout manager refused / did not switch
 * - `no-document`: no open drawing or view
 * - `stale`: a newer navigation started while waiting; nothing was done
 */
export type AcApFindNavigateResult =
  | 'navigated'
  | 'layout-mismatch'
  | 'layout-missing'
  | 'layout-switch-failed'
  | 'no-document'
  | 'stale'

const navigationTokens = new WeakMap<object, number>()

/**
 * Navigates to a FIND hit: activates its layout when needed, zooms to the text
 * and selects the owning entity.
 *
 * Same-layout hits are handled synchronously (before the first `await`), so
 * callers may ignore the returned promise in that case. For a hit in another
 * layout the layout is activated through the document's layout manager; the
 * first-visit auto zoom of that layout is suppressed (it would otherwise
 * override this zoom), then the function waits for the layout's entities to
 * be converted before selecting, because selection highlighting needs the
 * entity to be present in the scene.
 *
 * @param editor - Document manager that owns the active view and drawing.
 * @param hit - Hit returned by `acapFindText`.
 */
export async function acapNavigateToFindHit(
  editor: AcApDocManager,
  hit: AcApFindLayoutHit,
  options: AcApFindNavigateOptions = {}
): Promise<AcApFindNavigateResult> {
  const view = editor.curView
  const db = editor.curDocument?.database
  if (!view || !db) return 'no-document'

  const token = (navigationTokens.get(view) ?? 0) + 1
  navigationTokens.set(view, token)

  if (view.activeLayoutBtrId !== hit.layoutId) {
    if (options.activateLayout === false) return 'layout-mismatch'
    if (!db.tables.blockTable.getIdAt(hit.layoutId)) return 'layout-missing'

    if (!view.isLayoutInitialized(hit.layoutId)) {
      // We frame the layout ourselves; keep its first-visit auto zoom from
      // running afterwards and overriding the zoom to the hit.
      view.markLayoutAsInitialized(hit.layoutId)
    }
    acdbHostApplicationServices().layoutManager.setCurrentLayoutBtrId(
      hit.layoutId,
      db
    )
    if (view.activeLayoutBtrId !== hit.layoutId) return 'layout-switch-failed'

    await view.waitUntilIdle(options.idleTimeoutMs ?? 15_000)
    if (navigationTokens.get(view) !== token) return 'stale'
    if (view.activeLayoutBtrId !== hit.layoutId) return 'stale'
  }

  const box = acapFindHitBox(db, hit.layoutId, hit)
  zoomToVisible(
    view as unknown as Parameters<typeof zoomToVisible>[0],
    box,
    options.margin ?? 1.1,
    options.insets
  )
  view.selectionSet.clear()
  view.selectionSet.add(hit.entityId)
  return 'navigated'
}
