/**
 * Widget mounted while a command is prompting, or while a selection-driven
 * session UI is active. Desktop layouts show accessories at the top center of
 * the canvas; phone/pad layouts show them at the top of the bottom session panel.
 *
 * Kept as a types-only module so the command layer does not import chrome DOM.
 */

import type { AcEdBaseView } from '../view/AcEdBaseView'
import type { AcEdCommand } from './AcEdCommand'

/** Desktop top-center slot vs mobile session panel. */
export type AcEdSessionAccessorySlot = 'desktop' | 'mobile'

/** Arguments passed to {@link AcEdSessionAccessory.mount}. */
export interface AcEdSessionAccessoryOptions {
  /** Mount row for the accessory controls. */
  host: HTMLElement
  /** Which chrome slot owns {@link host}. */
  type: AcEdSessionAccessorySlot
  /** View that owns the chrome / session accessory host. */
  view: AcEdBaseView
}

/**
 * Mount target resolved by the view for the current layout / mobile prompt state.
 */
export interface AcEdSessionAccessoryHostInfo {
  /** DOM row that receives accessory controls. */
  host: HTMLElement
  /** Which chrome slot owns {@link host}. */
  type: AcEdSessionAccessorySlot
}

/**
 * Registry id for the draw-style session provider on a view.
 *
 * @see {@link AcEdDrawStyleSessionHost}
 * @see {@link AcEdSessionProviderRegistry}
 */
export const ACED_DRAW_STYLE_SESSION_PROVIDER_ID = 'draw-style'

/**
 * Draw-style controls provider registered under
 * {@link ACED_DRAW_STYLE_SESSION_PROVIDER_ID}.
 *
 * Long-lived owner of color / font-size controls; mints mountable session
 * accessories via {@link createSessionAccessory}.
 */
export interface AcEdDrawStyleSessionHost {
  /**
   * Updates the active measure/markup session before controls mount.
   *
   * @param kind - `'measure'`, `'markup'`, or `undefined` when inactive.
   */
  setActiveKind(kind: 'measure' | 'markup' | undefined): void
  /** Builds the session accessory that reparents draw-style controls. */
  createSessionAccessory(): AcEdSessionAccessory
}

/**
 * Session UI widget with a stable id and mount/unmount lifecycle.
 */
export interface AcEdSessionAccessory {
  /** Stable id so a re-show can replace rather than stack. */
  id: string
  /**
   * Called when the accessory slot is shown.
   *
   * @param options - Host element, slot type, and owning view.
   */
  mount(options: AcEdSessionAccessoryOptions): void
  /** Called on hide or when a different accessory replaces this one. */
  unmount(): void
}

/**
 * Payload for session-accessory mount / unmount editor events.
 */
export interface AcEdSessionAccessoryEventArgs {
  /** Command that owns the accessory, or `null` for selection-driven mounts. */
  command: AcEdCommand | null
  /** Accessory being mounted or unmounted. */
  accessory: AcEdSessionAccessory
  /** Mount options; present on mount events and usually on unmount. */
  options?: AcEdSessionAccessoryOptions
  /** Whether this lifecycle is driven by a command or by selection. */
  source: 'command' | 'selection'
}
