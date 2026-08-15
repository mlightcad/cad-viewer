/**
 * Shared markup grip / attached-callout helpers used by concrete markup entities.
 */

import { AcGeMatrix3d, type AcDbObjectId } from '@mlightcad/data-model'
import {
  AcTrHtmlCallout,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlDot,
  type AcTrHtmlElement,
  type AcTrHtmlGroup
} from '@mlightcad/three-renderer'

import {
  bindOverlayCalloutGrips,
  bindOverlayPointerDrag,
  drawOverlayLeader,
  fitOverlayCanvas,
  placeOverlayHtml
} from '../../overlay'
import type { AcTrView2d } from '../../../view'
import {
  markupGeometryCenter,
  translateMarkupGeometry,
  translateMarkupPoint
} from '../AcApMarkupGeometry'
import { runMarkupEdit } from '../AcApMarkupHistory'
import { republishMarkup } from '../AcApMarkupRepublish'
import type { AcApMarkupShapeOutline } from '../AcApMarkupShapeCallout'
import { computeLeaderTipOnShape } from '../AcApMarkupShapeCallout'
import { getMarkupStore } from '../AcApMarkupStore'
import { bindMarkupInlineTextEdit } from '../AcApMarkupTextEdit'
import type {
  AcApMarkupAttachedCallout,
  AcApMarkupPoint2d,
  AcApMarkupRecord
} from '../AcApMarkupTypes'
import {
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth
} from '../AcApMarkupUtil'
import type { AcApMarkupDrawStyle } from './AcApMarkupEntity'

/**
 * Live visuals for a shape-attached callout (leader + tip + bubble).
 */
export interface AcApMarkupAttachedCalloutVisual {
  /** Mutable tip / anchor updated during grips and center move. */
  live: { tip: AcApMarkupPoint2d; anchor: AcApMarkupPoint2d }
  /** Redraw the leader canvas from {@link live}. */
  redraw: () => void
  /** Tip grip HTML dot. */
  tipDot: AcTrHtmlDot
  /** Text bubble HTML callout. */
  bubble: AcTrHtmlCallout
}

/**
 * Select a markup HTML group and sync the store selection id.
 *
 * @param view2d - Active 2D view.
 * @param id - Markup / group id to select.
 */
export function selectMarkupGroup(view2d: AcTrView2d, id: string): void {
  getMarkupStore().setSelectedId(id)
  view2d.htmlTransientManager.selectGroup(id)
}

/**
 * Options for {@link publishAttachedCallout}.
 */
export interface AcApPublishAttachedCalloutOptions {
  /** Active 2D view. */
  view: AcTrView2d
  /** Parent markup group that receives the bubble, tip, and canvas. */
  group: AcTrHtmlGroup
  /** Parent shape markup record. */
  record: AcApMarkupRecord
  /** Attached callout geometry from the store. */
  callout: AcApMarkupAttachedCallout
  /** Resolved draw style for color / layer / layout. */
  style: AcApMarkupDrawStyle
  /** Cleanup list that receives viewChanged / grip unbinders. */
  cleanups: Array<() => void>
  /** Shape outline used to constrain the tip grip. */
  outline: AcApMarkupShapeOutline
}

/**
 * Attach a shape callout (leader without arrow + text bubble) with tip/bubble grips.
 *
 * @param options - Parent group, record, callout geometry, and outline.
 * @returns Live visual handles for center-move coupling.
 */
export function publishAttachedCallout(
  options: AcApPublishAttachedCalloutOptions
): AcApMarkupAttachedCalloutVisual {
  const { view: view2d, group, record, callout, style, cleanups, outline } =
    options
  const { color, layer, layoutId } = style
  const container = view2d.container
  const overlay = new AcTrHtmlCanvasOverlay({
    id: `${record.id}-shape-leader`,
    container,
    layer,
    layoutId
  })
  group.addCanvas(overlay)

  const live: { tip: AcApMarkupPoint2d; anchor: AcApMarkupPoint2d } = {
    tip: { ...callout.tip },
    anchor: { ...callout.anchor }
  }

  /**
   * Redraw the leader stroke from {@link live} tip / anchor.
   */
  const redraw = () => {
    const ctx = fitOverlayCanvas(overlay.canvas, container)
    if (!ctx) return
    drawOverlayLeader(
      ctx,
      view2d.worldToScreen(live.tip),
      view2d.worldToScreen(live.anchor),
      record.style.color,
      false,
      markupCanvasLineWidth(
        record.style.lineWeight != null && record.style.lineWeight > 0
          ? record.style.lineWeight
          : MARKUP_LINE_WEIGHT
      )
    )
  }
  redraw()
  view2d.events.viewChanged.addEventListener(redraw)
  cleanups.push(() => view2d.events.viewChanged.removeEventListener(redraw))

  const bubble = new AcTrHtmlCallout({
    id: `${record.id}-shape-bubble`,
    color,
    text: callout.text || record.text || '',
    fontSize: record.style.fontSize,
    worldPosition: live.anchor,
    layer,
    layoutId
  })
  const tipDot = new AcTrHtmlDot({
    id: `${record.id}-shape-tip`,
    color,
    worldPosition: live.tip,
    layer,
    layoutId
  })
  group.add(bubble, tipDot)

  cleanups.push(
    bindMarkupInlineTextEdit({
      view: view2d,
      el: bubble.textElement,
      listenOn: bubble.element,
      recordId: record.id,
      multiline: true
    })
  )

  cleanups.push(
    bindOverlayCalloutGrips({
      view: view2d,
      group,
      tipEl: tipDot,
      bubbleEl: bubble,
      state: live,
      constrainTip: point => computeLeaderTipOnShape(outline, point),
      onDragStart: () => selectMarkupGroup(view2d, record.id),
      onLiveChange: redraw,
      onCommit: next => {
        const current = getMarkupStore().get(record.id)
        if (!current || current.geometry.type !== outline.kind) return
        const geom = current.geometry
        if (
          geom.type !== 'cloud' &&
          geom.type !== 'rect' &&
          geom.type !== 'circle'
        ) {
          return
        }
        runMarkupEdit(view2d, 'Move Callout', () => {
          const updated = getMarkupStore().updateGeometry(record.id, {
            ...geom,
            callout: {
              tip: next.tip,
              anchor: next.anchor,
              text: geom.callout?.text ?? callout.text
            }
          })
          if (updated) republishMarkup(view2d, updated)
        })
      }
    })
  )

  return { live, redraw, tipDot, bubble }
}

/**
 * Options for {@link bindMarkupCenterMove}.
 */
export interface AcApMarkupCenterMoveOptions {
  /** Active 2D view. */
  view: AcTrView2d
  /** Markup id whose geometry is updated on commit. */
  recordId: string
  /** Center grip HTML element. */
  centerEl: AcTrHtmlElement
  /** CAD transient ids preview-transformed during drag. */
  entityIds: AcDbObjectId[]
  /** Optional attached callout to keep in sync while moving. */
  attached?: AcApMarkupAttachedCalloutVisual
}

/**
 * Whole-markup drag via a center grip element.
 *
 * Live-previews CAD transients with a translation matrix and optionally moves
 * an attached callout; commits via {@link translateMarkupGeometry}.
 *
 * @param options - Center handle, entity ids, and optional attached callout.
 * @returns Cleanup that unbinds the pointer drag.
 */
export function bindMarkupCenterMove(
  options: AcApMarkupCenterMoveOptions
): () => void {
  const { view, recordId, centerEl, entityIds, attached } = options
  /** World origin captured at drag start (geometry center or element position). */
  let origin = {
    x: centerEl.object.position.x,
    y: centerEl.object.position.y
  }
  /** Last pointer world position during the drag. */
  let last = { ...origin }
  /** Attached callout tip/anchor at drag start, for relative preview. */
  let originalCallout: AcApMarkupAttachedCallout | undefined
  return bindOverlayPointerDrag({
    view,
    el: centerEl.element,
    cursor: 'move',
    onDragStart: () => {
      selectMarkupGroup(view, recordId)
      const stored = getMarkupStore().get(recordId)
      const center = stored ? markupGeometryCenter(stored.geometry) : undefined
      origin = center ?? {
        x: centerEl.object.position.x,
        y: centerEl.object.position.y
      }
      last = { ...origin }
      originalCallout = attached
        ? {
            tip: { ...attached.live.tip },
            anchor: { ...attached.live.anchor }
          }
        : undefined
    },
    onMove: point => {
      last = point
      const dx = point.x - origin.x
      const dy = point.y - origin.y
      if (entityIds.length > 0) {
        const matrix = new AcGeMatrix3d().makeTranslation(dx, dy, 0)
        view.updateTransientPreviewTransforms(
          entityIds.map(objectId => ({ objectId, matrix }))
        )
      }
      placeOverlayHtml(view, centerEl, point)
      if (attached && originalCallout) {
        attached.live.tip = translateMarkupPoint(originalCallout.tip, dx, dy)
        attached.live.anchor = translateMarkupPoint(
          originalCallout.anchor,
          dx,
          dy
        )
        placeOverlayHtml(view, attached.tipDot, attached.live.tip)
        placeOverlayHtml(view, attached.bubble, attached.live.anchor)
        attached.redraw()
      }
    },
    onCommit: () => {
      const dx = last.x - origin.x
      const dy = last.y - origin.y
      if (Math.hypot(dx, dy) < 1e-9) return
      runMarkupEdit(view, 'Move Markup', () => {
        const current = getMarkupStore().get(recordId)
        if (!current) return
        const updated = getMarkupStore().updateGeometry(
          recordId,
          translateMarkupGeometry(current.geometry, dx, dy)
        )
        if (updated) republishMarkup(view, updated)
      })
    }
  })
}
