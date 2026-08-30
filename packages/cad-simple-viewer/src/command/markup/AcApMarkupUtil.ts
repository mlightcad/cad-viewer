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
import { acapScreenPxToWcs } from '../overlay/AcApOverlayDrawUtil'
import type { AcApMarkupStyle } from './AcApMarkupTypes'

/** Factory default markup color (ACI red) used to seed the draw style. */
export function createDefaultMarkupColor(): AcCmColor {
  return new AcCmColor(AcCmColorMethod.ByACI, 1)
}

/**
 * Overlay line weight meaning "no CAD lineweight" (hairline).
 *
 * Drawn as 1 CSS pixel and not scaled with zoom until the user picks a
 * numeric lineweight from the drawing-style / style toolbar.
 */
export const MARKUP_HAIRLINE_LINE_WEIGHT = 0 as AcGiLineWeight

/** Factory default CAD line weight for markup geometry. */
export const MARKUP_LINE_WEIGHT = MARKUP_HAIRLINE_LINE_WEIGHT

/** Factory default screen font size (CSS px) for text / callout markups. */
export const MARKUP_FONT_SIZE = 12

/** Session draw color for newly created markups. */
let markupDrawColor: AcCmColor = createDefaultMarkupColor()

/** Session draw line weight for newly created markups. */
let markupDrawLineWeight: AcGiLineWeight = MARKUP_LINE_WEIGHT

/** Session draw font size for newly created text / callout markups. */
let markupDrawFontSize = MARKUP_FONT_SIZE

const drawStyleListeners = new Set<() => void>()

function notifyMarkupDrawStyleChanged(): void {
  for (const listener of drawStyleListeners) listener()
}

/** Notify when session markup color / lineweight / font size changes. */
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

/** Current line weight used when drawing markups. */
export function getMarkupLineWeight(): AcGiLineWeight {
  return markupDrawLineWeight
}

/** Current font size (CSS px) used when drawing text / callout markups. */
export function getMarkupFontSize(): number {
  return markupDrawFontSize
}

/** Update the session markup draw color (affects current/future markups). */
export function setMarkupDrawColor(color: AcCmColor): void {
  markupDrawColor = color.clone()
  notifyMarkupDrawStyleChanged()
}

/** Update the session markup draw line weight. */
export function setMarkupDrawLineWeight(weight: AcGiLineWeight): void {
  if (!Number.isFinite(weight) || weight < 0) return
  markupDrawLineWeight = weight
  notifyMarkupDrawStyleChanged()
}

/** Update the session markup draw font size (CSS px). */
export function setMarkupDrawFontSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) return
  markupDrawFontSize = size
  notifyMarkupDrawStyleChanged()
}

/**
 * Resolve a stored markup line weight, treating missing / negative CAD
 * specials as the session default. `0` is hairline and is kept.
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

/** Build a style object from the current markup draw color / line weight / font size. */
export function defaultMarkupStyle(): AcApMarkupStyle {
  return {
    color: markupColorToCss(defaultMarkupColor()),
    lineWeight: getMarkupLineWeight(),
    fontSize: getMarkupFontSize()
  }
}

/** Attach world-space text/stroke sizes from the current view (sidecar export). */
export function withMarkupStyleWcs(
  style: AcApMarkupStyle,
  view: AcEdBaseView
): AcApMarkupStyle {
  const fontSize =
    style.fontSize != null && style.fontSize > 0
      ? style.fontSize
      : MARKUP_FONT_SIZE
  const lineWeight = resolveMarkupLineWeight(style.lineWeight)
  const strokePx = markupCanvasLineWidth(lineWeight)
  return {
    ...style,
    textHeightWcs: acapScreenPxToWcs(fontSize, view),
    strokeWidthWcs:
      strokePx > 0 ? acapScreenPxToWcs(strokePx, view) : undefined
  }
}

/**
 * Merge a style patch while keeping world-space sizes independent of color.
 *
 * Only recomputes / scales {@link AcApMarkupStyle.textHeightWcs} when font size
 * changes, and {@link AcApMarkupStyle.strokeWidthWcs} when line weight changes.
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
  const prevWeight = resolveMarkupLineWeight(previous.lineWeight)
  const nextWeight = resolveMarkupLineWeight(next.lineWeight)

  const fontSizeChanged =
    patch.fontSize != null && patch.fontSize !== previous.fontSize
  const lineWeightChanged =
    patch.lineWeight != null && patch.lineWeight !== previous.lineWeight

  let textHeightWcs = previous.textHeightWcs ?? next.textHeightWcs
  if (fontSizeChanged) {
    if (textHeightWcs != null && textHeightWcs > 0 && prevFont > 0) {
      textHeightWcs = textHeightWcs * (nextFont / prevFont)
    } else {
      textHeightWcs = acapScreenPxToWcs(nextFont, view)
    }
  } else if (textHeightWcs == null || !(textHeightWcs > 0)) {
    textHeightWcs = acapScreenPxToWcs(nextFont, view)
  }

  let strokeWidthWcs = previous.strokeWidthWcs ?? next.strokeWidthWcs
  const nextPx = markupCanvasLineWidth(nextWeight)
  if (!(nextPx > 0)) {
    strokeWidthWcs = undefined
  } else if (lineWeightChanged) {
    const prevPx = markupCanvasLineWidth(prevWeight)
    if (strokeWidthWcs != null && strokeWidthWcs > 0 && prevPx > 0) {
      strokeWidthWcs = strokeWidthWcs * (nextPx / prevPx)
    } else {
      strokeWidthWcs = acapScreenPxToWcs(nextPx, view)
    }
  } else if (strokeWidthWcs == null || !(strokeWidthWcs > 0)) {
    strokeWidthWcs = acapScreenPxToWcs(nextPx, view)
  }

  return {
    ...next,
    textHeightWcs,
    strokeWidthWcs
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
