/**
 * Widget mounted while a command is prompting. Desktop layouts show accessories
 * at the top center of the canvas; phone/pad layouts show them at the top of
 * the bottom session panel. Commands return this from
 * {@link AcEdCommand.createSessionAccessory}.
 *
 * Kept as a types-only module so the command layer does not import chrome DOM.
 */
export interface AcEdSessionAccessory {
  /** Stable id so a re-show can replace rather than stack. */
  id: string
  /** Called when the accessory slot is shown. `host` is the mount row. */
  mount(host: HTMLElement): void
  /** Called on hide or when a different accessory replaces this one. */
  unmount(): void
}
