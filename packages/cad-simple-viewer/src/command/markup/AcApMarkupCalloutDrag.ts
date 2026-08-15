/**
 * Pointer-drag grips for markup HTML overlays (callout, arrow, shape center).
 */

import type { AcTrHtmlElement, AcTrHtmlGroup } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../view'
import {
  type AcApMarkupShapeOutline,
  computeLeaderTipOnShape
} from './AcApMarkupShapeCallout'
import type { AcApMarkupPoint2d } from './AcApMarkupTypes'

export interface AcApMarkupCalloutGripState {
  tip: AcApMarkupPoint2d
  anchor: AcApMarkupPoint2d
}

/**
 * Convert a pointer event to a world-space 2D point on the view.
 */
export function pointerEventToMarkupWorld(
  view: AcTrView2d,
  ev: PointerEvent
): AcApMarkupPoint2d {
  const canvas = view.viewportToCanvas({
    x: ev.clientX,
    y: ev.clientY
  })
  const world = view.screenToWorld(canvas)
  return { x: world.x, y: world.y }
}

/** Move a published HTML overlay and refresh its transform baseline. */
export function placeMarkupHtml(
  view: AcTrView2d,
  el: AcTrHtmlElement,
  point: AcApMarkupPoint2d
): void {
  view.htmlTransientManager.updatePosition(el.id, point)
}

const DRAG_THRESHOLD_PX = 4

const windowListenerOptions: AddEventListenerOptions = {
  capture: true,
  passive: false
}

/**
 * Bind pointer-drag on one HTML overlay handle.
 * Hover + drag works without selecting the markup first.
 * Drag starts only after a small move so a double-click can still edit text.
 *
 * Move / up listeners are attached to `window`, not the handle. CSS2D
 * repositions the handle under the cursor every frame; listening on the
 * element (or capturing pointer on it) loses events after the first drag.
 */
export function bindMarkupPointerDrag(options: {
  view: AcTrView2d
  el: HTMLElement
  cursor?: string
  onDragStart?: () => void
  onMove: (world: AcApMarkupPoint2d, ev: PointerEvent) => void
  onCommit: () => void
}): () => void {
  const { view, el, onDragStart, onMove, onCommit } = options
  const idleCursor = options.cursor ?? 'grab'

  el.style.pointerEvents = 'auto'
  el.style.cursor = idleCursor
  el.style.touchAction = 'none'
  el.style.userSelect = 'none'

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
      onMove(pointerEventToMarkupWorld(view, ev), ev)
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
 * Wire drag handles on callout tip + bubble.
 * - Bubble: free move of text location
 * - Tip: free move for standalone callouts; constrained to {@link outline}
 *   for shape-attached callouts (cloud / rect / circle)
 */
export function bindMarkupCalloutGrips(options: {
  view: AcTrView2d
  group: AcTrHtmlGroup
  tipEl: AcTrHtmlElement
  bubbleEl: AcTrHtmlElement
  state: AcApMarkupCalloutGripState
  outline?: AcApMarkupShapeOutline
  onDragStart?: () => void
  onLiveChange: () => void
  onCommit: (next: AcApMarkupCalloutGripState) => void
}): () => void {
  const {
    view,
    tipEl,
    bubbleEl,
    state,
    outline,
    onDragStart,
    onLiveChange,
    onCommit
  } = options

  tipEl.element.style.width = '14px'
  tipEl.element.style.height = '14px'

  const unbindTip = bindMarkupPointerDrag({
    view,
    el: tipEl.element,
    onDragStart,
    onMove: point => {
      state.tip = outline ? computeLeaderTipOnShape(outline, point) : point
      placeMarkupHtml(view, tipEl, state.tip)
      onLiveChange()
    },
    onCommit: () => {
      onCommit({ tip: { ...state.tip }, anchor: { ...state.anchor } })
    }
  })

  const unbindBubble = bindMarkupPointerDrag({
    view,
    el: bubbleEl.element,
    onDragStart,
    onMove: point => {
      state.anchor = point
      placeMarkupHtml(view, bubbleEl, state.anchor)
      onLiveChange()
    },
    onCommit: () => {
      onCommit({ tip: { ...state.tip }, anchor: { ...state.anchor } })
    }
  })

  return () => {
    unbindTip()
    unbindBubble()
  }
}
