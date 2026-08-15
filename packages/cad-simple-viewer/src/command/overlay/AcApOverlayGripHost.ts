/**
 * Pointer-drag grip host for overlay HTML handles (markup / measure).
 * Domain entities expose grip semantics; this module only wires pointer events.
 */

import type { AcTrHtmlElement, AcTrHtmlGroup } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../view'

/**
 * 2D world-space point used by overlay grip hosts.
 */
export interface AcApOverlayPoint2d {
  /** World X coordinate. */
  x: number
  /** World Y coordinate. */
  y: number
}

/**
 * Convert a pointer event to a world-space 2D point on the view.
 *
 * @param view - Active 2D view for viewport / world conversion.
 * @param ev - Pointer event in viewport client coordinates.
 * @returns World XY point under the pointer.
 */
export function acapPointerEventToOverlayWorld(
  view: AcTrView2d,
  ev: PointerEvent
): AcApOverlayPoint2d {
  const canvas = view.viewportToCanvas({
    x: ev.clientX,
    y: ev.clientY
  })
  const world = view.screenToWorld(canvas)
  return { x: world.x, y: world.y }
}

/**
 * Move a published HTML overlay and refresh its transform baseline.
 *
 * @param view - Active 2D view whose HTML transient manager owns `el`.
 * @param el - Published CSS2D overlay to reposition.
 * @param point - New world-space anchor.
 */
export function acapPlaceOverlayHtml(
  view: AcTrView2d,
  el: AcTrHtmlElement,
  point: AcApOverlayPoint2d
): void {
  view.htmlTransientManager.updatePosition(el.id, point)
}

/**
 * Pointer movement (CSS pixels, squared) that must be exceeded before a drag
 * starts, so double-click / contenteditable still work on the same handle.
 */
const DRAG_THRESHOLD_PX = 4

/**
 * Capture options for window-level move / up listeners during an active drag.
 */
const windowListenerOptions: AddEventListenerOptions = {
  capture: true,
  passive: false
}

/**
 * Options for {@link acapBindOverlayPointerDrag}.
 */
export interface AcApOverlayPointerDragOptions {
  /** Active 2D view used for world conversion and dirty flags. */
  view: AcTrView2d
  /** DOM handle that receives pointerdown. */
  el: HTMLElement
  /** Idle cursor CSS value (default `grab`). */
  cursor?: string
  /** Invoked once when the drag threshold is first exceeded. */
  onDragStart?: () => void
  /** Invoked on each pointer move after the drag has started. */
  onMove: (world: AcApOverlayPoint2d, ev: PointerEvent) => void
  /** Invoked on pointerup / cancel after a drag occurred. */
  onCommit: () => void
}

/**
 * Bind pointer-drag on one HTML overlay handle.
 *
 * Drag starts only after a small move so a double-click can still edit text.
 * Move / up listeners attach to `window` so CSS2D repositioning does not lose
 * events.
 *
 * @param options - Handle element and drag callbacks.
 * @returns Cleanup that removes listeners and cancels an in-progress drag.
 */
export function acapBindOverlayPointerDrag(
  options: AcApOverlayPointerDragOptions
): () => void {
  const { view, el, onDragStart, onMove, onCommit } = options
  const idleCursor = options.cursor ?? 'grab'

  el.style.pointerEvents = 'auto'
  el.style.cursor = idleCursor
  el.style.touchAction = 'none'
  el.style.userSelect = 'none'

  /** Detach function for the active window listeners, if any. */
  let detachActiveDrag: (() => void) | undefined

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (
      e.detail >= 2 ||
      target?.isContentEditable ||
      target?.closest('[contenteditable="true"]') ||
      el.querySelector('[contenteditable="true"]')
    ) {
      return
    }

    const pointerId = e.pointerId
    const startX = e.clientX
    const startY = e.clientY
    let dragging = false

    const detach = () => {
      window.removeEventListener(
        'pointermove',
        onPointerMove,
        windowListenerOptions
      )
      window.removeEventListener(
        'pointerup',
        onPointerUp,
        windowListenerOptions
      )
      window.removeEventListener(
        'pointercancel',
        onPointerUp,
        windowListenerOptions
      )
      if (detachActiveDrag === detach) detachActiveDrag = undefined
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      if (!dragging) {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          return
        }
        dragging = true
        ev.preventDefault()
        el.style.cursor = 'grabbing'
        onDragStart?.()
      }
      onMove(acapPointerEventToOverlayWorld(view, ev), ev)
      view.isHtmlDirty = true
    }

    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      detach()
      if (!dragging) return
      el.style.cursor = idleCursor
      onCommit()
    }

    detachActiveDrag?.()
    detachActiveDrag = detach
    window.addEventListener('pointermove', onPointerMove, windowListenerOptions)
    window.addEventListener('pointerup', onPointerUp, windowListenerOptions)
    window.addEventListener('pointercancel', onPointerUp, windowListenerOptions)
  }

  el.addEventListener('pointerdown', onPointerDown)
  return () => {
    el.removeEventListener('pointerdown', onPointerDown)
    detachActiveDrag?.()
  }
}

/**
 * Live tip / anchor state shared by callout tip and bubble grips.
 */
export interface AcApOverlayCalloutGripState {
  /** Leader tip in world coordinates. */
  tip: AcApOverlayPoint2d
  /** Text bubble anchor in world coordinates. */
  anchor: AcApOverlayPoint2d
}

/**
 * Options for {@link acapBindOverlayCalloutGrips}.
 */
export interface AcApOverlayCalloutGripOptions {
  /** Active 2D view. */
  view: AcTrView2d
  /** Parent markup / measure group (unused by host; reserved for callers). */
  group: AcTrHtmlGroup
  /** Tip handle overlay. */
  tipEl: AcTrHtmlElement
  /** Bubble handle overlay. */
  bubbleEl: AcTrHtmlElement
  /** Mutable tip / anchor state updated during drag. */
  state: AcApOverlayCalloutGripState
  /**
   * Optional tip constraint (e.g. project onto a shape outline).
   * When omitted, the tip moves freely.
   */
  constrainTip?: (point: AcApOverlayPoint2d) => AcApOverlayPoint2d
  /** Invoked when either tip or bubble drag starts. */
  onDragStart?: () => void
  /** Invoked after each live tip / anchor change. */
  onLiveChange: () => void
  /** Invoked when a tip or bubble drag commits. */
  onCommit: (next: AcApOverlayCalloutGripState) => void
}

/**
 * Wire drag handles on callout tip + bubble.
 *
 * Tip may be constrained via {@link AcApOverlayCalloutGripOptions.constrainTip}
 * (e.g. shape outline).
 *
 * @param options - Tip / bubble elements and callbacks.
 * @returns Cleanup that unbinds both grips.
 */
export function acapBindOverlayCalloutGrips(
  options: AcApOverlayCalloutGripOptions
): () => void {
  const {
    view,
    tipEl,
    bubbleEl,
    state,
    constrainTip,
    onDragStart,
    onLiveChange,
    onCommit
  } = options

  tipEl.element.style.width = '14px'
  tipEl.element.style.height = '14px'

  /** Tip / anchor captured when a tip or bubble drag starts. */
  let dragOrigin: AcApOverlayCalloutGripState = {
    tip: { ...state.tip },
    anchor: { ...state.anchor }
  }

  /**
   * True when live tip / anchor match the drag-start origin (no store write).
   */
  const isZeroDelta = (next: AcApOverlayCalloutGripState): boolean => {
    return (
      Math.hypot(next.tip.x - dragOrigin.tip.x, next.tip.y - dragOrigin.tip.y) <
        1e-9 &&
      Math.hypot(
        next.anchor.x - dragOrigin.anchor.x,
        next.anchor.y - dragOrigin.anchor.y
      ) < 1e-9
    )
  }

  const unbindTip = acapBindOverlayPointerDrag({
    view,
    el: tipEl.element,
    onDragStart: () => {
      dragOrigin = {
        tip: { ...state.tip },
        anchor: { ...state.anchor }
      }
      onDragStart?.()
    },
    onMove: point => {
      state.tip = constrainTip ? constrainTip(point) : point
      acapPlaceOverlayHtml(view, tipEl, state.tip)
      onLiveChange()
    },
    onCommit: () => {
      const next = { tip: { ...state.tip }, anchor: { ...state.anchor } }
      if (isZeroDelta(next)) return
      onCommit(next)
    }
  })

  const unbindBubble = acapBindOverlayPointerDrag({
    view,
    el: bubbleEl.element,
    onDragStart: () => {
      dragOrigin = {
        tip: { ...state.tip },
        anchor: { ...state.anchor }
      }
      onDragStart?.()
    },
    onMove: point => {
      state.anchor = point
      acapPlaceOverlayHtml(view, bubbleEl, state.anchor)
      onLiveChange()
    },
    onCommit: () => {
      const next = { tip: { ...state.tip }, anchor: { ...state.anchor } }
      if (isZeroDelta(next)) return
      onCommit(next)
    }
  })

  return () => {
    unbindTip()
    unbindBubble()
  }
}
