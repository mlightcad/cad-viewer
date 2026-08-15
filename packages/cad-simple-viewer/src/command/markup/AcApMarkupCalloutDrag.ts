/**
 * Pointer-drag grips for markup HTML overlays.
 *
 * Implementation lives in the shared overlay grip host; this module re-exports
 * markup-facing names for existing call sites.
 */

import type { AcTrHtmlElement, AcTrHtmlGroup } from '@mlightcad/three-renderer'

import {
  bindOverlayCalloutGrips,
  bindOverlayPointerDrag,
  placeOverlayHtml,
  pointerEventToOverlayWorld,
  type AcApOverlayCalloutGripState,
  type AcApOverlayPoint2d,
  type AcApOverlayPointerDragOptions
} from '../overlay'
import type { AcTrView2d } from '../../view'
import {
  type AcApMarkupShapeOutline,
  computeLeaderTipOnShape
} from './AcApMarkupShapeCallout'
import type { AcApMarkupPoint2d } from './AcApMarkupTypes'

/**
 * Alias of {@link AcApOverlayCalloutGripState} for markup call sites.
 */
export type AcApMarkupCalloutGripState = AcApOverlayCalloutGripState

/**
 * Convert a pointer event to a world-space 2D point on the view.
 *
 * @deprecated Prefer {@link pointerEventToOverlayWorld}.
 * @param view - Active 2D view.
 * @param ev - Pointer event in viewport client coordinates.
 * @returns World XY under the pointer.
 */
export function pointerEventToMarkupWorld(
  view: AcTrView2d,
  ev: PointerEvent
): AcApMarkupPoint2d {
  return pointerEventToOverlayWorld(view, ev)
}

/**
 * Move a published HTML overlay and refresh its transform baseline.
 *
 * @deprecated Prefer {@link placeOverlayHtml}.
 * @param view - Active 2D view.
 * @param el - Published CSS2D overlay.
 * @param point - New world-space anchor.
 */
export function placeMarkupHtml(
  view: AcTrView2d,
  el: AcTrHtmlElement,
  point: AcApOverlayPoint2d
): void {
  placeOverlayHtml(view, el, point)
}

/**
 * Bind pointer-drag on one HTML overlay handle.
 *
 * @deprecated Prefer {@link bindOverlayPointerDrag}.
 * @param options - Same as {@link AcApOverlayPointerDragOptions}.
 * @returns Cleanup that removes listeners.
 */
export function bindMarkupPointerDrag(
  options: AcApOverlayPointerDragOptions
): () => void {
  return bindOverlayPointerDrag(options)
}

/**
 * Options for {@link bindMarkupCalloutGrips}.
 */
export interface AcApMarkupCalloutGripBindOptions {
  /** Active 2D view. */
  view: AcTrView2d
  /** Parent markup group. */
  group: AcTrHtmlGroup
  /** Tip handle overlay. */
  tipEl: AcTrHtmlElement
  /** Bubble handle overlay. */
  bubbleEl: AcTrHtmlElement
  /** Mutable tip / anchor state. */
  state: AcApMarkupCalloutGripState
  /**
   * When set, tip drags are projected onto this shape outline
   * (cloud / rect / circle attached callouts).
   */
  outline?: AcApMarkupShapeOutline
  /** Invoked when tip or bubble drag starts. */
  onDragStart?: () => void
  /** Invoked after each live tip / anchor change. */
  onLiveChange: () => void
  /** Invoked when a tip or bubble drag commits. */
  onCommit: (next: AcApMarkupCalloutGripState) => void
}

/**
 * Wire drag handles on callout tip + bubble.
 *
 * Tip is constrained to {@link AcApMarkupCalloutGripBindOptions.outline} when
 * provided.
 *
 * @param options - Tip / bubble elements, state, and optional outline.
 * @returns Cleanup that unbinds both grips.
 */
export function bindMarkupCalloutGrips(
  options: AcApMarkupCalloutGripBindOptions
): () => void {
  const { outline, ...rest } = options
  return bindOverlayCalloutGrips({
    ...rest,
    constrainTip: outline
      ? point => computeLeaderTipOnShape(outline, point)
      : undefined
  })
}
