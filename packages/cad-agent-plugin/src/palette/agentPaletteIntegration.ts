/** Callback that opens or focuses the agent tab in the host tool palette. */
export type AgentPaletteOpener = () => void

/** Palette opener registered by cad-viewer at startup. */
let paletteOpener: AgentPaletteOpener | undefined

/**
 * Registers the function cad-viewer calls when the `agent` command runs.
 *
 * @param opener - Palette opener, or `undefined` to clear the registration.
 */
export function setAgentPaletteOpener(opener: AgentPaletteOpener | undefined) {
  paletteOpener = opener
}

/**
 * Invokes the registered palette opener.
 *
 * @returns `true` if an opener was registered and called; otherwise `false`.
 */
export function openAgentPalette(): boolean {
  if (!paletteOpener) {
    return false
  }
  paletteOpener()
  return true
}
