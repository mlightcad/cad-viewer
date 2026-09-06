import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGiLineWeight
} from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'
import { acCmColorToCssHex, parseCssToAcCmColor } from '../../util/AcApCssColor'
import { ACAP_OVERLAY_ARROW_SIZE_PX, acapScreenPxToWcs } from '../overlay/AcApOverlayDrawUtil'
import type { AcApMarkupStyle } from './AcApMarkupTypes'

/** Factory default markup color (ACI red) used to seed the draw style. */
export function createDefaultMarkupColor(): AcCmColor {
  return new AcCmColor(AcCmColorMethod.ByACI, 1)
}

/**
 * Overlay line weight meaning "no CAD lineweight" (hairline).
 *
 * Drawn as 1 CSS pixel and not scaled with zoom.
 */
export const MARKUP_HAIRLINE_LINE_WEIGHT = 0 as AcGiLineWeight

/** Factory default CAD line weight for markup geometry. */
export const MARKUP_LINE_WEIGHT = MARKUP_HAIRLINE_LINE_WEIGHT

/** Factory default screen font size (CSS px) for text / callout markups. */
export const MARKUP_FONT_SIZE = 12

/** Session draw color for newly created markups. */
let markupDrawColor: AcCmColor = createDefaultMarkupColor()

/** Session draw font size for newly created text / callout markups. */
let markupDrawFontSize = MARKUP_FONT_SIZE

/** Session text-height authoring mode. */
let markupTextHeightMode: 'adaptive' | 'custom' = 'adaptive'

/** Session custom WCS text height when mode is `'custom'`. */
let markupCustomTextHeightWcs: number | undefined

const drawStyleListeners = new Set<() => void>()

function notifyMarkupDrawStyleChanged(): void {
  for (const listener of drawStyleListeners) listener()
}

/** Notify when session markup color / font size changes. */
export function subscribeMarkupDrawStyle(listener: () => void): () => void {
  drawStyleListeners.add(listener)
  return () => {
    drawStyleListeners.delete(listener)
  }
}

/** Current color used when drawing markups (clone for safety). */
export function defaultMarkupColor(): AcCmColor {
  return markupDrawColor.clone()
}

/** Current font size (CSS px) used when drawing text / callout markups. */
export function getMarkupFontSize(): number {
  return markupDrawFontSize
}

/** Current markup text-height authoring mode. */
export function getMarkupTextHeightMode(): 'adaptive' | 'custom' {
  return markupTextHeightMode
}

/** Custom WCS text height for the markup draw session, if any. */
export function getMarkupCustomTextHeightWcs(): number | undefined {
  return markupCustomTextHeightWcs
}

/** Update the session markup draw color (affects current/future markups). */
export function setMarkupDrawColor(color: AcCmColor): void {
  markupDrawColor = color.clone()
  notifyMarkupDrawStyleChanged()
}

/** Update the session markup draw font size (CSS px). */
export function setMarkupDrawFontSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) return
  markupDrawFontSize = size
  markupTextHeightMode = 'adaptive'
  markupCustomTextHeightWcs = undefined
  notifyMarkupDrawStyleChanged()
}

/**
 * Sets adaptive (screen) or custom (WCS) text height for new markups.
 *
 * @param mode - Authoring mode.
 * @param value - Font size px when adaptive; WCS height when custom.
 */
export function setMarkupTextHeight(
  mode: 'adaptive' | 'custom',
  value: number
): void {
  if (!Number.isFinite(value) || value <= 0) return
  markupTextHeightMode = mode
  if (mode === 'adaptive') {
    markupDrawFontSize = value
    markupCustomTextHeightWcs = undefined
  } else {
    markupCustomTextHeightWcs = value
  }
  notifyMarkupDrawStyleChanged()
}

/**
 * Resolve a stored markup line weight, treating missing / negative CAD
 * specials as the hairline default. `0` is hairline and is kept.
 */
export function resolveMarkupLineWeight(
  weight: number | undefined | null
): AcGiLineWeight {
  return typeof weight === 'number' && Number.isFinite(weight) && weight >= 0
    ? (weight as AcGiLineWeight)
    : MARKUP_LINE_WEIGHT
}

/** Map a CAD line weight to a canvas stroke width in CSS pixels. */
export function markupCanvasLineWidth(weight: AcGiLineWeight | number): number {
  const n = Number(weight)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.max(1, n / 28)
}

/** Convert AcCmColor to a CSS color string for sidecar style. */
export function markupColorToCss(color: AcCmColor): string {
  return acCmColorToCssHex(color)
}

/** Parse a CSS color string back into AcCmColor (best-effort). */
export function cssToMarkupColor(css: string): AcCmColor {
  return parseCssToAcCmColor(css, [255, 0, 0])
}

/** Build a style object from the current markup draw color / font size. */
export function defaultMarkupStyle(): AcApMarkupStyle {
  return {
    color: markupColorToCss(defaultMarkupColor()),
    lineWeight: MARKUP_LINE_WEIGHT,
    fontSize: getMarkupFontSize(),
    textHeightMode: markupTextHeightMode,
    ...(markupTextHeightMode === 'custom' &&
    markupCustomTextHeightWcs != null &&
    markupCustomTextHeightWcs > 0
      ? { textHeightWcs: markupCustomTextHeightWcs }
      : {})
  }
}

/** Attach world-space text height (and arrow length) from the current view. */
export function withMarkupStyleWcs(
  style: AcApMarkupStyle,
  view: AcEdBaseView
): AcApMarkupStyle {
  const fontSize =
    style.fontSize != null && style.fontSize > 0
      ? style.fontSize
      : MARKUP_FONT_SIZE
  const arrowSizeWcs =
    style.arrowSizeWcs != null && style.arrowSizeWcs > 0
      ? style.arrowSizeWcs
      : acapScreenPxToWcs(ACAP_OVERLAY_ARROW_SIZE_PX, view)
  let textHeightWcs: number
  if (
    style.textHeightMode === 'custom' &&
    style.textHeightWcs != null &&
    style.textHeightWcs > 0
  ) {
    // Custom: keep the authored world height — never re-derive from fontSize.
    textHeightWcs = style.textHeightWcs
  } else if (style.textHeightMode === 'adaptive') {
    // Fit-to-screen: bake the current screen font size into WCS at commit.
    textHeightWcs = acapScreenPxToWcs(fontSize, view)
  } else if (style.textHeightWcs != null && style.textHeightWcs > 0) {
    textHeightWcs = style.textHeightWcs
  } else {
    textHeightWcs = acapScreenPxToWcs(fontSize, view)
  }
  return {
    ...style,
    lineWeight: MARKUP_LINE_WEIGHT,
    textHeightWcs,
    arrowSizeWcs
  }
}

/**
 * Merge a style patch while keeping world-space text size independent of color.
 *
 * Only recomputes / scales {@link AcApMarkupStyle.textHeightWcs} when font size
 * changes. Overlay strokes stay hairline; {@link AcApMarkupStyle.strokeWidthWcs}
 * is never written.
 */
export function patchMarkupStyleWcs(
  previous: AcApMarkupStyle,
  next: AcApMarkupStyle,
  view: AcEdBaseView,
  patch: Partial<AcApMarkupStyle>
): AcApMarkupStyle {
  const prevFont =
    previous.fontSize != null && previous.fontSize > 0
      ? previous.fontSize
      : MARKUP_FONT_SIZE
  const nextFont =
    next.fontSize != null && next.fontSize > 0 ? next.fontSize : MARKUP_FONT_SIZE

  const fontSizeChanged =
    patch.fontSize != null && patch.fontSize !== previous.fontSize
  const customHeightChanged =
    patch.textHeightWcs != null && patch.textHeightWcs !== previous.textHeightWcs
  const mode = next.textHeightMode ?? previous.textHeightMode ?? 'adaptive'

  let textHeightWcs = previous.textHeightWcs ?? next.textHeightWcs
  if (mode === 'custom' && next.textHeightWcs != null && next.textHeightWcs > 0) {
    textHeightWcs = next.textHeightWcs
  } else if (fontSizeChanged) {
    if (textHeightWcs != null && textHeightWcs > 0 && prevFont > 0) {
      textHeightWcs = textHeightWcs * (nextFont / prevFont)
    } else {
      textHeightWcs = acapScreenPxToWcs(nextFont, view)
    }
  } else if (customHeightChanged) {
    textHeightWcs = next.textHeightWcs
  } else if (textHeightWcs == null || !(textHeightWcs > 0)) {
    textHeightWcs = acapScreenPxToWcs(nextFont, view)
  }

  const { strokeWidthWcs: _omitStroke, ...rest } = next
  return {
    ...rest,
    textHeightMode: mode,
    lineWeight: MARKUP_LINE_WEIGHT,
    textHeightWcs,
    arrowSizeWcs:
      previous.arrowSizeWcs != null && previous.arrowSizeWcs > 0
        ? previous.arrowSizeWcs
        : next.arrowSizeWcs
  }
}

/** Create a new unique markup id. */
export function createMarkupId(prefix = 'markup'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** ISO timestamp for created/updated fields. */
export function markupNow(): string {
  return new Date().toISOString()
}

/**
 * Markup author from the AutoCAD-compatible **LOGINNAME** system variable.
 *
 * @see https://help.autodesk.com/view/ACD/2026/ENU/?caas=caas/documentation/CIV3D/2014/ENU/filesACD/GUID-81446F4E-F6DC-442A-9889-EE777D3D49B9-htm.html
 */
export function getMarkupAuthor(db: AcDbDatabase): string {
  const raw = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.LOGINNAME,
    db
  )
  return typeof raw === 'string' ? raw.trim() : ''
}
