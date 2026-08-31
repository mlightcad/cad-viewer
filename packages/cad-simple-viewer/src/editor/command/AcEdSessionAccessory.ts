/**
 * Widget mounted at the top of the phone/pad session panel while a command
 * is prompting. Commands return this from
 * {@link AcEdCommand.createSessionAccessory}.
 *
 * Kept as a types-only module so the command layer does not import chrome DOM.
 */
export interface AcEdSessionAccessory {
  /** Stable id so a re-show can replace rather than stack. */
  id: string
  /** Called when the session panel is shown. `host` is the accessory row. */
  mount(host: HTMLElement): void
  /** Called on hide or when a different accessory replaces this one. */
  unmount(): void
}
