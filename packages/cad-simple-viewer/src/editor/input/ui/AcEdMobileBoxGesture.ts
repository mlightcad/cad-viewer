import {
  ACED_TOUCH_POINT_LONG_PRESS_MS,
  acedArmTouchMouseGuard,
  acedShouldIgnoreCompatMouse,
  acedSinkFollowingClick,
  AcEdTouchPointSession
} from './AcEdTouchPointSession'

/**
 * Host callbacks for {@link acedAttachMobileBoxGesture}.
 *
 * Gesture: hold still past {@link ACED_TOUCH_POINT_LONG_PRESS_MS} to lock the
 * first corner, drag the rubber band, release to commit the second corner.
 * Movement before the timer aborts into pan. A short tap never starts a box.
 */
export interface AcEdMobileBoxGestureHost {
  /** Element that receives pointer / touch events (usually the canvas). */
  element: HTMLElement
  /**
   * When provided, pointer-down is ignored unless this returns true
   * (for example idle selection, or pan mode on phone/pad).
   */
  shouldStart?: () => boolean
  /**
   * Long-press fired: first corner is locked at this client sample.
   * Caller should disable navigation and show the preview rect.
   */
  onActivate: (clientX: number, clientY: number) => void
  /** Finger moved while the box is active. */
  onMove: (clientX: number, clientY: number) => void
  /**
   * Finger up after activate.
   *
   * @param moved - False when the release is still within the click threshold
   *   of the first corner (degenerate box).
   */
  onBoxEnd: (clientX: number, clientY: number, moved: boolean) => void
  /** Short tap (no long-press). Optional; omit when taps should be ignored. */
  onTap?: (clientX: number, clientY: number) => void
  /** Called when an active box is aborted (`pointercancel` after activate). */
  onAbort?: () => void
  /** Enable / disable view navigation (OrbitControls) during the box drag. */
  setNavigationEnabled?: (enabled: boolean) => void
  /**
   * Client-pixel distance treated as a click rather than a box.
   * Defaults to 8 CSS pixels.
   */
  clickThresholdPx?: number
}

/**
 * Attaches a mobile long-press → drag → release box gesture to `host.element`.
 *
 * @returns Dispose function that removes listeners and cancels any in-flight
 *   gesture.
 */
export function acedAttachMobileBoxGesture(
  host: AcEdMobileBoxGestureHost
): () => void {
  const session = new AcEdTouchPointSession()
  const clickThreshold = host.clickThresholdPx ?? 8
  let activated = false
  let startClientX = 0
  let startClientY = 0
  let capturePointerId: number | null = null

  const restoreNavigation = () => {
    host.setNavigationEnabled?.(true)
  }

  const clearCapture = () => {
    if (capturePointerId == null) return
    try {
      if (host.element.hasPointerCapture(capturePointerId)) {
        host.element.releasePointerCapture(capturePointerId)
      }
    } catch {
      // Pointer may already be released.
    }
    capturePointerId = null
  }

  const finishCompat = () => {
    acedArmTouchMouseGuard()
    acedSinkFollowingClick()
  }

  const resetGesture = () => {
    const wasActivated = activated
    activated = false
    session.cancel()
    clearCapture()
    restoreNavigation()
    if (wasActivated) host.onAbort?.()
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || e.button !== 0) return
    if (host.shouldStart && !host.shouldStart()) return
    e.preventDefault()
    acedArmTouchMouseGuard()
    activated = false
    session.start(e.pointerId, e.clientX, e.clientY, () => {
      activated = true
      startClientX = session.x
      startClientY = session.y
      host.setNavigationEnabled?.(false)
      host.onActivate(session.x, session.y)
    })
    capturePointerId = e.pointerId
    try {
      host.element.setPointerCapture(e.pointerId)
    } catch {
      capturePointerId = null
    }
  }

  const applyMove = (clientX: number, clientY: number) => {
    const moved = session.move(clientX, clientY, true)
    if (moved === 'panning') {
      clearCapture()
      restoreNavigation()
      return 'panning' as const
    }
    if (!activated || !session.isLoupe) return 'continue' as const
    host.onMove(clientX, clientY)
    return 'continue' as const
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    if (e.pointerId !== session.pointerId) return
    applyMove(e.clientX, e.clientY)
  }

  const complete = (
    clientX: number,
    clientY: number,
    commit: boolean,
    pointerId: number
  ) => {
    if (session.phase === 'idle') return
    if (pointerId !== session.pointerId) return

    const wasActivated = activated
    const startX = startClientX
    const startY = startClientY
    const action = commit
      ? session.end()
      : (session.cancel(), 'ignore' as const)
    activated = false
    clearCapture()
    restoreNavigation()
    finishCompat()

    if (!commit || action === 'ignore') {
      if (wasActivated) host.onAbort?.()
      return
    }

    if (wasActivated) {
      const dx = clientX - startX
      const dy = clientY - startY
      const moved = Math.hypot(dx, dy) >= clickThreshold
      host.onBoxEnd(clientX, clientY, moved)
      return
    }
    host.onTap?.(clientX, clientY)
  }

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    complete(e.clientX, e.clientY, true, e.pointerId)
  }

  const onPointerCancel = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    if (session.phase === 'idle') return
    if (e.pointerId !== session.pointerId) return
    // Still waiting for long-press: keep the gesture alive (Chrome/Safari
    // synthesize pointercancel for OS long-press). After activate, cancel.
    if (!activated && session.isPicking) {
      clearCapture()
      finishCompat()
      return
    }
    complete(e.clientX, e.clientY, false, e.pointerId)
  }

  const onTouchStart = (e: TouchEvent) => {
    if (session.phase === 'idle') return
    if (e.touches.length !== 1) return
    e.preventDefault()
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!session.isPicking) return
    const touch = e.touches[0] ?? e.changedTouches[0]
    if (!touch) return
    const result = applyMove(touch.clientX, touch.clientY)
    if (result === 'panning') return
    if (!session.isLoupe) return
    e.preventDefault()
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (session.phase === 'idle') return
    if (e.touches.length > 0) return
    const touch = e.changedTouches[0]
    if (!touch) return
    complete(touch.clientX, touch.clientY, true, session.pointerId)
  }

  const onContextMenu = (e: MouseEvent) => {
    if (session.phase === 'idle' && !acedShouldIgnoreCompatMouse()) return
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  const touchListenerOptions: AddEventListenerOptions = { passive: false }
  host.element.addEventListener('pointerdown', onPointerDown)
  host.element.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  host.element.addEventListener(
    'touchstart',
    onTouchStart,
    touchListenerOptions
  )
  window.addEventListener('touchmove', onTouchMove, touchListenerOptions)
  window.addEventListener('touchend', onTouchEnd)
  host.element.addEventListener('contextmenu', onContextMenu, true)

  return () => {
    resetGesture()
    host.element.removeEventListener('pointerdown', onPointerDown)
    host.element.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    host.element.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    host.element.removeEventListener('contextmenu', onContextMenu, true)
  }
}

/** Re-export so callers can document the long-press delay without a second import. */
export { ACED_TOUCH_POINT_LONG_PRESS_MS }
