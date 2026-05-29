/**
 * Default canvas and ACI-7 foreground colours shared by the renderer
 * and the editor UI layer.
 *
 * ACI-7 inversion follows the layout background (`MODELBKCOLOR` /
 * `PAPERBKCOLOR`), not `COLORTHEME` (which only drives UI chrome).
 */
/** AutoCAD model-space default background: RGB(0, 0, 0). */
export const MODEL_SPACE_BACKGROUND = 0x000000

/** AutoCAD paper-space default background: RGB(255, 255, 255). */
export const PAPER_SPACE_BACKGROUND = 0xffffff

/** ACI-7 foreground on a dark canvas background. */
export const DARK_THEME_FOREGROUND = 0xffffff

/** ACI-7 foreground on a light canvas background. */
export const LIGHT_THEME_FOREGROUND = 0x000000

/** ITU-R BT.601 luma threshold used by {@link isLightBackground}. */
const LIGHT_BACKGROUND_LUMA_THRESHOLD = 128

/**
 * Whether a packed RGB colour is perceptually light (paper-like).
 *
 * Used to pick contrasting ACI-7 rendering on the current canvas
 * background from `MODELBKCOLOR` / `PAPERBKCOLOR`.
 */
export function isLightBackground(color: number): boolean {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return 0.299 * r + 0.587 * g + 0.114 * b > LIGHT_BACKGROUND_LUMA_THRESHOLD
}

/**
 * ACI-7 foreground that contrasts with a light or dark context.
 *
 * @param isLight - `true` for a light background or UI theme; `false` for dark.
 */
export function contrastingForegroundColor(isLight: boolean): number {
  return isLight ? LIGHT_THEME_FOREGROUND : DARK_THEME_FOREGROUND
}

/**
 * ACI-7 / foreground colour that contrasts with the canvas background.
 */
export function foregroundColorForBackground(backgroundColor: number): number {
  return contrastingForegroundColor(isLightBackground(backgroundColor))
}
