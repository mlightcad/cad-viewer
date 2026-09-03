import { acedIsMobileOrPadUi } from '../../global/AcEdUiLayout'
import { AcEdViewMode } from '../../view/AcEdViewMode'
import type { AcEdPromptBoxOptions } from '../prompt/AcEdPromptBoxOptions'
import type { AcEdPromptBoxResult } from '../prompt/AcEdPromptBoxResult'

/**
 * Box-prompt operations the {@link AcEdInteractionStrategy} can choose
 * between. Implemented by {@link AcEdInputManager}.
 */
export interface AcEdBoxPromptHost {
  /** Desktop: two chained point prompts with a live overlay. */
  acquireTwoPointBox(
    options: AcEdPromptBoxOptions
  ): Promise<AcEdPromptBoxResult>
  /**
   * Phone/pad: long-press + drag (touch) or click-drag / two clicks (mouse).
   */
  acquireHoldDragBox(
    options: AcEdPromptBoxOptions
  ): Promise<AcEdPromptBoxResult>
}

/**
 * Layout-level point-prompt chrome. Mouse-click vs touch long-press still
 * lives in {@link AcEdFloatingInput} (pointer type, not layout).
 */
export interface AcEdPointPromptPolicy {
  /** Plus marks after each confirmed pick in a multi-point command. */
  readonly showsConfirmedPointMarks: boolean
  /** Bottom session panel instead of the desktop command line. */
  readonly usesSessionChrome: boolean
  /**
   * Swallow canvas `contextmenu` during a prompt (touch long-press) instead
   * of treating it as right-click Enter.
   */
  readonly swallowsPromptContextMenu: boolean
  /**
   * Allow cursor-adjacent DYNMODE floating input. Still gated by the
   * **DYNMODE** sysvar.
   */
  readonly showsCursorDynamicInput: boolean
  /** Magnifier HUD while a touch long-press pick is in precise-capture. */
  readonly showsSnapLoupeOnTouchPick: boolean
}

const DESKTOP_POINT_POLICY: AcEdPointPromptPolicy = {
  showsConfirmedPointMarks: false,
  usesSessionChrome: false,
  swallowsPromptContextMenu: false,
  showsCursorDynamicInput: true,
  showsSnapLoupeOnTouchPick: false
}

const MOBILE_POINT_POLICY: AcEdPointPromptPolicy = {
  showsConfirmedPointMarks: true,
  usesSessionChrome: true,
  swallowsPromptContextMenu: true,
  showsCursorDynamicInput: false,
  showsSnapLoupeOnTouchPick: true
}

/**
 * Desktop vs phone/pad pointer rules for idle selection, box prompts, and
 * point-prompt chrome.
 *
 * Two independent axes:
 * - **Layout** (this strategy): session chrome, confirmed-point marks, snap
 *   loupe, whether `contextmenu` is Enter.
 * - **Pointer type** (`AcEdFloatingInput`): mouse click-to-commit vs touch
 *   long-press / short-tap. A pad with a mouse still clicks; a desktop with
 *   a touch screen still long-presses.
 *
 * Callers resolve the active strategy via {@link acedInteractionStrategy}
 * instead of branching on {@link acedIsMobileOrPadUi} at each call site.
 */
export interface AcEdInteractionStrategy {
  /**
   * Whether idle long-press box-select is allowed in this view mode.
   * Touch drag before the timer still pans.
   */
  canIdleTouchBox(mode: AcEdViewMode): boolean
  /** Acquires a rectangular box using this layout's pointer model. */
  acquireBox(
    host: AcEdBoxPromptHost,
    options: AcEdPromptBoxOptions
  ): Promise<AcEdPromptBoxResult>
  /** Point-prompt chrome and defaults for this layout. */
  readonly point: AcEdPointPromptPolicy
}

/** Mouse-first: box prompts are two clicks; idle touch box only in selection. */
export class AcEdDesktopInteractionStrategy implements AcEdInteractionStrategy {
  readonly point = DESKTOP_POINT_POLICY

  canIdleTouchBox(mode: AcEdViewMode): boolean {
    return mode === AcEdViewMode.SELECTION
  }

  acquireBox(
    host: AcEdBoxPromptHost,
    options: AcEdPromptBoxOptions
  ): Promise<AcEdPromptBoxResult> {
    return host.acquireTwoPointBox(options)
  }
}

/**
 * Touch-first: idle long-press box also works while panning (Select / Pan
 * hidden). Box prompts are hold-drag, with mouse click-drag / two-click
 * still available on pad-width windows and tablets with a pointer.
 */
export class AcEdMobileInteractionStrategy implements AcEdInteractionStrategy {
  readonly point = MOBILE_POINT_POLICY

  canIdleTouchBox(mode: AcEdViewMode): boolean {
    return mode === AcEdViewMode.SELECTION || mode === AcEdViewMode.PAN
  }

  acquireBox(
    host: AcEdBoxPromptHost,
    options: AcEdPromptBoxOptions
  ): Promise<AcEdPromptBoxResult> {
    return host.acquireHoldDragBox(options)
  }
}

const desktopStrategy = new AcEdDesktopInteractionStrategy()
const mobileStrategy = new AcEdMobileInteractionStrategy()

/**
 * Active nav/box/point interaction strategy for the current UI layout.
 *
 * Re-evaluated each call so a resize between desktop and pad picks up the
 * new rules without swapping listeners.
 */
export function acedInteractionStrategy(): AcEdInteractionStrategy {
  return acedIsMobileOrPadUi() ? mobileStrategy : desktopStrategy
}
