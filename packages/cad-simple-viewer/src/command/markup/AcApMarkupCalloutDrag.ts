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

const DRAG_THRESHOLD_PX = 4

/**
 * Bind pointer-drag on one HTML overlay handle.
 * Hover + drag works without selecting the markup first.
 * Drag starts only after a small move so a double-click can still edit text.
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

    const startX = e.clientX
    const startY = e.clientY
    let dragging = false

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragging) {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          return
        }
        dragging = true
        ev.preventDefault()
        el.setPointerCapture(ev.pointerId)
        el.style.cursor = 'grabbing'
        onDragStart?.()
      }
      onMove(pointerEventToMarkupWorld(view, ev), ev)
      view.isDirty = true
    }

    const onPointerUp = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      if (!dragging) return
      try {
        el.releasePointerCapture(ev.pointerId)
      } catch {
        // Capture may already have been released.
      }
      el.style.cursor = idleCursor
      onCommit()
    }

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
  }

  el.addEventListener('pointerdown', onPointerDown)
  return () => el.removeEventListener('pointerdown', onPointerDown)
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
      tipEl.setPosition(state.tip)
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
      bubbleEl.setPosition(state.anchor)
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
