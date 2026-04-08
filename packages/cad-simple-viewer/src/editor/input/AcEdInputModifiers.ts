/**
 * Snapshot of modifier key states captured by the editor input system.
 *
 * This mirrors the DOM Keyboard/MouseEvent modifier fields, but is exposed as
 * a stable, command-friendly data object so commands can read modifier state
 * without attaching to raw key/mouse events directly.
 *
 * Notes:
 * - This is a *moment-in-time* state (not a toggle).
 * - Toggle-style behaviors (e.g. Ctrl to flip arc direction) should live in
 *   {@link AcEdInputToggles}.
 */
export interface AcEdInputModifiers {
  /**
   * Whether the Control key is currently pressed.
   *
   * On Windows/Linux this reflects the physical Ctrl key.
   * On macOS, this reflects the Control key (not Command).
   */
  ctrlKey: boolean
  /**
   * Whether the Shift key is currently pressed.
   */
  shiftKey: boolean
  /**
   * Whether the Alt key is currently pressed.
   *
   * On macOS this is the Option key.
   */
  altKey: boolean
  /**
   * Whether the Meta key is currently pressed.
   *
   * On macOS this is the Command key.
   * On Windows this is the Windows key.
   */
  metaKey: boolean
}
