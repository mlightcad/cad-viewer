import { AcGePoint3d, type AcGeVector3dLike } from '@mlightcad/data-model'
import {
  AcTrHtmlCallout,
  AcTrHtmlCanvasOverlay,
  AcTrHtmlGrip
} from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view'
import {
  acapBindOverlayCalloutGrips,
  acapDrawOverlayLeader,
  acapFitOverlayCanvas,
  type AcApOverlayWorldDrawResult,
  acapPlaceOverlayHtml} from '../../overlay'
import { runMarkupEdit } from '../AcApMarkupHistory'
import { republishMarkup } from '../AcApMarkupRepublish'
import { getMarkupStore } from '../AcApMarkupStore'
import { bindMarkupInlineTextEdit } from '../AcApMarkupTextEdit'
import type { AcApMarkupPoint2d, AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupEntity } from './AcApMarkupEntity'
import {
  bindMarkupCenterMove,
  selectMarkupGroup
} from './AcApMarkupEntityGrips'

/**
 * Standalone callout markup (leader + bubble).
 *
 * Grips: tip (0), bubble anchor (1), and midpoint center-move (2).
 */
export class AcApMarkupCalloutEntity extends AcApMarkupEntity {
  /**
   * @param record - Store record whose geometry type must be `callout`.
   */
  constructor(record: AcApMarkupRecord) {
    super(record)
  }

  /**
   * Focus on the bubble anchor.
   *
   * @returns Anchor world point, or `undefined` when geometry is wrong type.
   */
  override primaryPoint() {
    const geom = this.record.geometry
    if (geom.type !== 'callout') return undefined
    return { x: geom.anchor.x, y: geom.anchor.y, z: 0 }
  }

  /**
   * Tip, anchor, and midpoint grips.
   *
   * @returns Three WCS grip points, or empty when geometry is wrong type.
   */
  override subGetGripPoints(): AcGePoint3d[] {
    const geom = this.record.geometry
    if (geom.type !== 'callout') return []
    return [
      new AcGePoint3d(geom.tip.x, geom.tip.y, 0),
      new AcGePoint3d(geom.anchor.x, geom.anchor.y, 0),
      new AcGePoint3d(
        (geom.tip.x + geom.anchor.x) / 2,
        (geom.tip.y + geom.anchor.y) / 2,
        0
      )
    ]
  }

  /**
   * Move tip (0), anchor (1), or both via midpoint (2).
   *
   * @param indices - Grip indices to move.
   * @param offset - World-space translation.
   * @returns This entity for chaining.
   */
  override subMoveGripPointsAt(
    indices: number[],
    offset: AcGeVector3dLike
  ): this {
    const geom = this.record.geometry
    if (geom.type !== 'callout') return this
    let tip = { ...geom.tip }
    let anchor = { ...geom.anchor }
    for (const index of indices) {
      if (index === 0) {
        tip = { x: tip.x + offset.x, y: tip.y + offset.y }
      } else if (index === 1) {
        anchor = { x: anchor.x + offset.x, y: anchor.y + offset.y }
      } else if (index === 2) {
        tip = { x: tip.x + offset.x, y: tip.y + offset.y }
        anchor = { x: anchor.x + offset.x, y: anchor.y + offset.y }
      }
    }
    this.record = {
      ...this.record,
      geometry: { type: 'callout', tip, anchor }
    }
    return this
  }

  /**
   * Publish leader canvas, bubble, tip/center dots, and tip/bubble/center grips.
   *
   * @param view - Active 2D view.
   * @returns Built visuals with deferred grip binding.
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    const geom = this.record.geometry
    if (geom.type !== 'callout') {
      return this.emptyResult(this.createGroup())
    }
    const { color, canvasLineWidth, layer, layoutId } = this.style()
    const group = this.createGroup()
    /** Unbinders for viewChanged, inline edit, and grips. */
    const cleanups: Array<() => void> = []
    /** Grip binders deferred until after manager.add(group). */
    const pendingGrips: Array<() => void> = []

    const container = view.container
    const overlay = new AcTrHtmlCanvasOverlay({
      id: `${this.record.id}-leader`,
      container,
      layer,
      layoutId
    })
    group.addCanvas(overlay)
    /** Live tip / anchor mutated during grips before store commit. */
    const live: { tip: AcApMarkupPoint2d; anchor: AcApMarkupPoint2d } = {
      tip: { ...geom.tip },
      anchor: { ...geom.anchor }
    }

    const bubble = new AcTrHtmlCallout({
      id: `${this.record.id}-bubble`,
      color,
      text: this.record.text || this.record.comment || 'Callout',
      fontSize: this.record.style.fontSize,
      worldPosition: live.anchor,
      layer,
      layoutId
    })
    const tipDot = new AcTrHtmlGrip({
      id: `${this.record.id}-tip`,
      color,
      worldPosition: live.tip,
      layer,
      layoutId
    })
    const centerDot = new AcTrHtmlGrip({
      id: `${this.record.id}-center`,
      color,
      worldPosition: {
        x: (live.tip.x + live.anchor.x) / 2,
        y: (live.tip.y + live.anchor.y) / 2
      },
      layer,
      layoutId
    })
    group.add(bubble, tipDot, centerDot)
    this.seedOverlaySizes(view, [bubble, tipDot, centerDot], [overlay.canvas])

    /**
     * Redraw the leader (with arrow) from {@link live}.
     */
    const redraw = () => {
      const ctx = acapFitOverlayCanvas(overlay.canvas, container)
      if (!ctx) return
      acapDrawOverlayLeader(
        ctx,
        view.worldToScreen(live.tip),
        view.worldToScreen(live.anchor),
        this.record.style.color,
        true,
        canvasLineWidth,
        view,
        this.record.style.strokeWidthWcs,
        this.record.style.arrowSizeWcs
      )
    }
    redraw()
    view.events.viewChanged.addEventListener(redraw)
    cleanups.push(() => view.events.viewChanged.removeEventListener(redraw))

    cleanups.push(
      bindMarkupInlineTextEdit({
        view,
        el: bubble.textElement,
        listenOn: bubble.element,
        recordId: this.record.id,
        multiline: true
      })
    )

    /**
     * Keep the center grip halfway between tip and bubble during live drag.
     */
    const syncCenter = () => {
      acapPlaceOverlayHtml(view, centerDot, {
        x: (live.tip.x + live.anchor.x) / 2,
        y: (live.tip.y + live.anchor.y) / 2
      })
    }
    pendingGrips.push(() => {
      cleanups.push(
        acapBindOverlayCalloutGrips({
          view,
          group,
          tipEl: tipDot,
          bubbleEl: bubble,
          state: live,
          onDragStart: () => selectMarkupGroup(view, this.record.id),
          onLiveChange: () => {
            redraw()
            syncCenter()
          },
          onCommit: next => {
            runMarkupEdit(view, 'Move Callout', () => {
              const updated = getMarkupStore().updateGeometry(this.record.id, {
                type: 'callout',
                tip: next.tip,
                anchor: next.anchor
              })
              if (updated) republishMarkup(view, updated)
            })
          }
        }),
        bindMarkupCenterMove({
          view,
          recordId: this.record.id,
          centerEl: centerDot,
          attached: {
            live,
            redraw,
            tipDot,
            bubble
          }
        })
      )
    })

    return {
      group,
      entityIds: [],
      dispose: () => {
        for (const fn of cleanups) {
          try {
            fn()
          } catch {
            // ignore
          }
        }
      },
      bindGrips: () => {
        for (const bind of pendingGrips) bind()
      }
    }
  }
}
