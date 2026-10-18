/** Callback that opens or focuses the script console in the host UI. */
export type CadScriptPaletteOpener = () => void

/** Opener registered by the host application at startup. */
let paletteOpener: CadScriptPaletteOpener | undefined

/**
 * Registers the function the host calls when the `cadscript` command runs.
 *
 * @param opener - Palette opener, or `undefined` to clear the registration.
 */
export function setCadScriptPaletteOpener(
  opener: CadScriptPaletteOpener | undefined
) {
  paletteOpener = opener
}

/**
 * Invokes the registered script-console opener.
 *
 * @returns `true` if an opener was registered and called; otherwise `false`.
 */
export function openCadScriptPalette(): boolean {
  if (!paletteOpener) {
    return false
  }
  paletteOpener()
  return true
}
