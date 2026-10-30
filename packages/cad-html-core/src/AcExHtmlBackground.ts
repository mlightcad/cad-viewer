import type { AcExLayoutSnapshot, AcExSnapshot } from './AcExSnapshotTypes'

/** Black canvas written into exported HTML (`0x000000`). */
export const ACEX_HTML_BACKGROUND_BLACK = 0x000000

/** White canvas written into exported HTML (`0xffffff`). */
export const ACEX_HTML_BACKGROUND_WHITE = 0xffffff

/**
 * Drawing background for an exported HTML file.
 *
 * - `'black'` (default) — every layout uses a black canvas.
 * - `'white'` — every layout uses a white canvas.
 * - `'space'` — model space is black and paper space is white, matching
 *   AutoCAD. The offline viewer changes the canvas when the layout changes.
 *   {@link AcExSnapshot.meta.background} is the initially active layout's color.
 */
export type AcExHtmlBackground = 'black' | 'white' | 'space'

/**
 * Normalizes an export background. Omitted and unknown values are `'black'`.
 */
export function resolveAcExHtmlBackground(
  background: AcExHtmlBackground | undefined
): AcExHtmlBackground {
  if (background === 'white' || background === 'space') return background
  return 'black'
}

/**
 * Resolves a single-canvas background to a 24-bit RGB integer.
 * `'space'` is not a single color; pass {@link acExHtmlLayoutBackground} instead.
 */
export function acExHtmlBackgroundRgb(
  background: Exclude<AcExHtmlBackground, 'space'> | undefined
): number {
  return background === 'white'
    ? ACEX_HTML_BACKGROUND_WHITE
    : ACEX_HTML_BACKGROUND_BLACK
}

/**
 * Canvas color for one layout.
 *
 * `'space'` uses black in model space and white in paper space. Any other
 * mode uses `singleBackground` for every layout (older snapshots omit the mode).
 */
export function acExHtmlLayoutBackground(
  mode: AcExHtmlBackground | undefined,
  isModelSpace: boolean,
  singleBackground: number
): number {
  if (mode === 'space') {
    return isModelSpace
      ? ACEX_HTML_BACKGROUND_BLACK
      : ACEX_HTML_BACKGROUND_WHITE
  }
  return singleBackground >>> 0
}

/**
 * Luminance check matching the offline viewer's black/white background toggle.
 */
function isLightRgb(hex: number): boolean {
  const color = hex >>> 0
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128
}

/**
 * Flips near-black and near-white ink. Colored pixels are left alone.
 * Same thresholds as the offline viewer's background toggle.
 */
function invertNearBlackWhite(hex: number): number | null {
  const color = hex >>> 0
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min > 16) return null
  if (max <= 40) return ACEX_HTML_BACKGROUND_WHITE
  if (min >= 215) return ACEX_HTML_BACKGROUND_BLACK
  return null
}

function invertColor(hex: number): number {
  return invertNearBlackWhite(hex) ?? hex
}

function remapLayoutForeground(
  layout: AcExLayoutSnapshot,
  sourceBackground: number,
  targetBackground: number
): void {
  if (isLightRgb(sourceBackground) === isLightRgb(targetBackground)) return
  for (const batch of layout.lineBatches) {
    batch.color = invertColor(batch.color)
  }
  for (const batch of layout.meshBatches) {
    if (batch.texture) continue
    batch.color = invertColor(batch.color)
    const gradient = batch.gradientFill
    if (!gradient) continue
    gradient.startColor = invertColor(gradient.startColor)
    gradient.endColor = invertColor(gradient.endColor)
  }
}

/**
 * Points snapshot foreground ink at `targetBackground`.
 *
 * Geometry is captured against `sourceBackground` (the live canvas, which is
 * white when paper space is active). When the chosen canvas has the opposite
 * lightness, near-black and near-white batch colors are swapped so ACI 7 and
 * wipeouts stay visible. Image textures stay white so the raster is not tinted.
 */
export function remapAcExSnapshotForegroundForBackground(
  snapshot: AcExSnapshot,
  sourceBackground: number,
  targetBackground: number
): void {
  const target = targetBackground >>> 0
  snapshot.meta.background = target
  for (const layout of snapshot.layouts) {
    remapLayoutForeground(layout, sourceBackground, target)
  }
}

/**
 * Bakes {@link AcExHtmlBackground} into a snapshot.
 *
 * `'black'` and `'white'` remap every layout onto one canvas.
 * `'space'` remaps model layouts onto black and paper layouts onto white, and
 * stores the active layout's color in {@link AcExSnapshot.meta.background} so
 * the loading screen matches the first view.
 */
export function applyAcExHtmlBackground(
  snapshot: AcExSnapshot,
  sourceBackground: number,
  mode: AcExHtmlBackground
): void {
  const resolved = resolveAcExHtmlBackground(mode)
  snapshot.meta.backgroundMode = resolved
  if (resolved === 'space') {
    for (const layout of snapshot.layouts) {
      remapLayoutForeground(
        layout,
        sourceBackground,
        acExHtmlLayoutBackground('space', layout.isModelSpace, 0)
      )
    }
    const active = snapshot.layouts.find(
      layout => layout.btrId === snapshot.activeLayoutBtrId
    )
    snapshot.meta.background = acExHtmlLayoutBackground(
      'space',
      active == null || active.isModelSpace,
      ACEX_HTML_BACKGROUND_BLACK
    )
    return
  }
  remapAcExSnapshotForegroundForBackground(
    snapshot,
    sourceBackground,
    acExHtmlBackgroundRgb(resolved)
  )
  snapshot.meta.backgroundMode = resolved
}
