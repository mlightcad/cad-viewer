import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGiLineWeight
} from '@mlightcad/data-model'

import type { AcApMarkupStyle } from './AcApMarkupTypes'

/** Factory default markup color (ACI red) used to seed the draw style. */
export function createDefaultMarkupColor(): AcCmColor {
  return new AcCmColor(AcCmColorMethod.ByACI, 1)
}

/** Factory default CAD line weight for markup geometry. */
export const MARKUP_LINE_WEIGHT = AcGiLineWeight.LineWeight070

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
  if (!(weight > 0)) return
  markupDrawLineWeight = weight
  notifyMarkupDrawStyleChanged()
}

/** Update the session markup draw font size (CSS px). */
export function setMarkupDrawFontSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) return
  markupDrawFontSize = size
  notifyMarkupDrawStyleChanged()
}

/** Map a CAD line weight to a canvas stroke width in CSS pixels. */
export function markupCanvasLineWidth(weight: AcGiLineWeight | number): number {
  const n = Number(weight)
  if (!Number.isFinite(n) || n <= 0) return 2
  return Math.max(1, n / 28)
}

/** Convert AcCmColor to a CSS color string for sidecar style. */
export function markupColorToCss(color: AcCmColor): string {
  return color.cssColor ?? `rgb(${color.red}, ${color.green}, ${color.blue})`
}

/** Parse a CSS color string back into AcCmColor (best-effort). */
export function cssToMarkupColor(css: string): AcCmColor {
  const fromString = AcCmColor.fromString(css)
  if (fromString) return fromString
  try {
    return new AcCmColor().setRGBFromCss(css)
  } catch {
    return createDefaultMarkupColor()
  }
}

/** Build a style object from the current markup draw color / line weight / font size. */
export function defaultMarkupStyle(): AcApMarkupStyle {
  return {
    color: markupColorToCss(defaultMarkupColor()),
    lineWeight: getMarkupLineWeight(),
    fontSize: getMarkupFontSize()
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
