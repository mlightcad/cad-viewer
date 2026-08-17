/**
 * Pointer-drag grip host for offline HTML markup overlays.
 *
 * Mirrors `@mlightcad/cad-simple-viewer` {@link acapBindOverlayPointerDrag}:
 * drag starts after a small move so double-click / contenteditable still work.
 *
 * @module AcExMarkupGripDrag
 * @packageDocumentation
 */

import type { AcExMarkupPoint2d } from './AcExMarkupTypes'

/** Pointer movement (CSS px, squared) before a drag starts. */
const DRAG_THRESHOLD_PX = 4

const windowListenerOptions: AddEventListenerOptions = {
  capture: true,
  passive: false
}

/** Options for {@link acExBindMarkupPointerDrag}. */
export interface AcExMarkupPointerDragOptions {
  /** DOM handle that receives pointerdown. */
  el: HTMLElement
  /** Convert client coordinates to world XY. */
  clientToWorld: (clientX: number, clientY: number) => AcExMarkupPoint2d
  /** Idle cursor CSS value (default `grab`). */
  cursor?: string
  /** Called on pointerdown before any move (e.g. select the markup). */
  onPointerDown?: (ev: PointerEvent) => void
  /** Invoked once when the drag threshold is first exceeded. */
  onDragStart?: () => void
  /** Invoked on each pointer move after the drag has started. */
  onMove: (world: AcExMarkupPoint2d, ev: PointerEvent) => void
  /** Invoked on pointerup / cancel after a drag occurred. */
  onCommit: () => void
  /** When true, the binding is inactive (e.g. a create tool is active). */
  isEnabled?: () => boolean
}

/**
 * Bind pointer-drag on one HTML overlay handle.
 *
 * @returns Cleanup that removes listeners and cancels an in-progress drag.
 */
export function acExBindMarkupPointerDrag(
  options: AcExMarkupPointerDragOptions
): () => void {
  const { el, clientToWorld, onDragStart, onMove, onCommit } = options
  const idleCursor = options.cursor ?? 'grab'

  el.style.pointerEvents = 'auto'
  el.style.cursor = idleCursor
  el.style.touchAction = 'none'
  el.style.userSelect = 'none'

  let detachActiveDrag: (() => void) | undefined

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    if (options.isEnabled && !options.isEnabled()) return
    const target = e.target as HTMLElement | null
    if (
      e.detail >= 2 ||
      target?.isContentEditable ||
      target?.closest('[contenteditable="true"]') ||
      el.querySelector('[contenteditable="true"]')
    ) {
      return
    }

    options.onPointerDown?.(e)
    e.stopPropagation()
    e.preventDefault()
    // Capture so OrbitControls / canvas handlers cannot steal the gesture.
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // Some browsers reject capture on non-primary targets.
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
      onMove(clientToWorld(ev.clientX, ev.clientY), ev)
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
