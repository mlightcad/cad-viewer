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
import {
  acExHideMobileSnapLoupe,
  acExRefreshMobileSnapLoupe
} from './AcExMobileSnapLoupe'
import {
  acExIsOverlayGrip,
  acExIsOverlayGripSelected,
  acExSetOverlayGripsDragging
} from './AcExOverlayGrip'

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
  /**
   * When true (default), touch drags refresh the shared mobile snap loupe.
   * Set false for whole-object moves that do not use object snap
   * (callout bubble, text/stamp).
   */
  showSnapLoupe?: boolean
}

/**
 * Bind pointer-drag on one HTML overlay handle.
 *
 * On touch, osnap grips also drive the shared mobile snap loupe so the user
 * can see the magnified sample while moving an endpoint.
 *
 * @returns Cleanup that removes listeners and cancels an in-progress drag.
 */
export function acExBindMarkupPointerDrag(
  options: AcExMarkupPointerDragOptions
): () => void {
  const { el, clientToWorld, onDragStart, onMove, onCommit } = options
  const isGrip = acExIsOverlayGrip(el)
  const idleCursor = options.cursor ?? 'grab'
  const showSnapLoupeOpt = options.showSnapLoupe !== false

  if (!isGrip) {
    el.style.pointerEvents = 'auto'
  }
  el.style.cursor = idleCursor
  el.style.touchAction = 'none'
  el.style.userSelect = 'none'

  let detachActiveDrag: (() => void) | undefined
  let hidGrips = false

  const dragAllowed = (): boolean => {
    if (options.isEnabled && !options.isEnabled()) return false
    if (isGrip && !acExIsOverlayGripSelected(el)) return false
    return true
  }

  const restoreGrips = () => {
    if (!hidGrips) return
    hidGrips = false
    acExSetOverlayGripsDragging(false)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    if (!dragAllowed()) return
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
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // Some browsers reject capture on non-primary targets.
    }

    const pointerId = e.pointerId
    const startX = e.clientX
    const startY = e.clientY
    let dragging = false
    const showSnapLoupe = showSnapLoupeOpt && e.pointerType === 'touch'

    const hideSnapLoupe = () => {
      if (showSnapLoupe) acExHideMobileSnapLoupe()
    }

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
        if (isGrip) {
          hidGrips = true
          acExSetOverlayGripsDragging(true)
        }
        onDragStart?.()
      }
      const world = clientToWorld(ev.clientX, ev.clientY)
      if (showSnapLoupe) {
        acExRefreshMobileSnapLoupe(ev.clientX, ev.clientY)
      }
      onMove(world, ev)
    }

    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      detach()
      hideSnapLoupe()
      if (!dragging) return
      el.style.cursor = idleCursor
      restoreGrips()
      onCommit()
    }

    detachActiveDrag?.()
    detachActiveDrag = () => {
      hideSnapLoupe()
      restoreGrips()
      detach()
    }
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
