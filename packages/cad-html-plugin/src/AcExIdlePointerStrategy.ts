import { acExHtmlIsMobileNavUi } from './AcExHtmlDrawerSheet'
import type { AcExHtmlNavMode } from './AcExHtmlNavTools'

/**
 * Shared canvas operations used by {@link AcExIdlePointerStrategy}.
 * Implemented by the HTML viewer runtime; strategies never touch the DOM.
 */
export interface AcExIdlePointerHost {
  /** Current idle nav tool, or `null` while a drawing tool is active. */
  navMode: () => AcExHtmlNavMode | null
  /** True while leftover mouse events after a touch gesture should be ignored. */
  shouldIgnoreCompatMouse: () => boolean
  /**
   * Starts a long-press box (select or zoom-window). Must `preventDefault`
   * but must not `stopImmediatePropagation`, so OrbitControls can pan if
   * the finger moves before the timer.
   */
  startTouchBox: (kind: 'select' | 'zoom-window', event: PointerEvent) => void
  /**
   * Starts an immediate mouse/pen rubber-band. Stops propagation so
   * OrbitControls does not pan during the drag.
   */
  startMouseBox: (event: PointerEvent) => void
  /**
   * Completes a non-touch box gesture.
   *
   * @returns True when this event matched the active mouse/pen box.
   */
  finishMouseBox: (event: PointerEvent, commit: boolean) => boolean
  /** Zoom-window first/second click. */
  handleNavPointerDown: (event: PointerEvent) => boolean
  /** Overlay click-select (markup, then measure). */
  applyClickSelect: (event: PointerEvent) => boolean
}

/**
 * Idle (non-drawing) pointer policy. Desktop and mobile implementations
 * differ in which nav modes start a touch long-press box.
 */
export abstract class AcExIdlePointerStrategy {
  /**
   * Whether a still finger in this nav mode should long-press into a box
   * (and therefore keep one-finger pan armed until that long-press).
   */
  abstract allowsTouchBox(navMode: AcExHtmlNavMode): boolean

  /** One-finger OrbitControls pan while waiting for a long-press box. */
  enablesIdleTouchPan(navMode: AcExHtmlNavMode): boolean {
    return this.allowsTouchBox(navMode)
  }

  /**
   * Handles idle pointerdown. Drawing tools must be dispatched by the
   * caller first.
   *
   * @returns True when the event was consumed by idle nav / selection.
   */
  onPointerDown(event: PointerEvent, host: AcExIdlePointerHost): boolean {
    if (event.pointerType === 'mouse' && host.shouldIgnoreCompatMouse()) {
      return true
    }

    const navMode = host.navMode()
    if (event.pointerType === 'touch' && navMode) {
      const kind = this.touchBoxKind(navMode)
      if (kind) {
        host.startTouchBox(kind, event)
        return true
      }
    }

    if (event.pointerType !== 'touch' && navMode === 'select') {
      host.startMouseBox(event)
      return true
    }

    if (host.handleNavPointerDown(event)) return true
    return host.applyClickSelect(event)
  }

  /**
   * Completes a mouse/pen box. Touch boxes end through the touch session.
   *
   * @returns True when a mouse/pen box consumed the event.
   */
  onPointerUp(event: PointerEvent, host: AcExIdlePointerHost): boolean {
    if (event.pointerType === 'touch') return false
    return host.finishMouseBox(event, true)
  }

  /**
   * Aborts a mouse/pen box.
   *
   * @returns True when a mouse/pen box consumed the event.
   */
  onPointerCancel(event: PointerEvent, host: AcExIdlePointerHost): boolean {
    if (event.pointerType === 'touch') return false
    return host.finishMouseBox(event, false)
  }

  private touchBoxKind(
    navMode: AcExHtmlNavMode
  ): 'select' | 'zoom-window' | null {
    if (!this.allowsTouchBox(navMode)) return null
    return navMode === 'zoom-window' ? 'zoom-window' : 'select'
  }
}

/** Select / zoom-window long-press only; pan is left to OrbitControls. */
export class AcExDesktopIdlePointerStrategy extends AcExIdlePointerStrategy {
  allowsTouchBox(navMode: AcExHtmlNavMode): boolean {
    return navMode === 'select' || navMode === 'zoom-window'
  }
}

/**
 * Unified idle touch: drag pans, long-press boxes, including while the
 * hidden-toolbar default mode is pan.
 */
export class AcExMobileIdlePointerStrategy extends AcExIdlePointerStrategy {
  allowsTouchBox(navMode: AcExHtmlNavMode): boolean {
    return (
      navMode === 'select' || navMode === 'zoom-window' || navMode === 'pan'
    )
  }
}

const desktopStrategy = new AcExDesktopIdlePointerStrategy()
const mobileStrategy = new AcExMobileIdlePointerStrategy()

/**
 * Idle pointer strategy for the current HTML layout.
 *
 * Re-evaluated each call so rotating a tablet or resizing the window
 * switches rules without rebinding listeners.
 */
export function acExIdlePointerStrategy(): AcExIdlePointerStrategy {
  return acExHtmlIsMobileNavUi() ? mobileStrategy : desktopStrategy
}
