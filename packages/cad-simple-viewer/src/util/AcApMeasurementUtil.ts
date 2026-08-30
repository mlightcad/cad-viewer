import {
  AcCmColor,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGiLineWeight
} from '@mlightcad/data-model'

import { acCmColorToCssHex, parseCssToAcCmColor } from './AcApCssColor'

/**
 * Overlay line weight meaning "no CAD lineweight" (hairline).
 *
 * Drawn as 1 CSS pixel and not scaled with zoom until the user picks a
 * numeric lineweight from the drawing-style / style toolbar.
 */
export const OVERLAY_HAIRLINE_LINE_WEIGHT = 0 as AcGiLineWeight

/** Factory default CAD line weight for measurement geometry. */
export const MEASUREMENT_LINE_WEIGHT = OVERLAY_HAIRLINE_LINE_WEIGHT

/** Factory default screen font size (CSS px) for measurement badges. */
export const MEASUREMENT_FONT_SIZE = 13

/** Session draw color for newly created measurements (undefined = use sysvar). */
let measurementDrawColor: AcCmColor | undefined

/** Session draw line weight for newly created measurements. */
let measurementDrawLineWeight: AcGiLineWeight = MEASUREMENT_LINE_WEIGHT

/** Session draw font size for newly created measurement badges. */
let measurementDrawFontSize = MEASUREMENT_FONT_SIZE

/** Visual style stored on a committed measurement group. */
export interface AcApMeasurementStyle {
  color: AcCmColor
  lineWeight: AcGiLineWeight
  fontSize: number
}

/** Returns the current measurement overlay color (session override or MEASUREMENTCOLOR). */
export function acapGetMeasurementColor(db: AcDbDatabase): AcCmColor {
  if (measurementDrawColor) return measurementDrawColor.clone()
  return AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.MEASUREMENTCOLOR,
    db
  ) as AcCmColor
}

/** Current line weight used when drawing measurements. */
export function acapGetMeasurementLineWeight(): AcGiLineWeight {
  return measurementDrawLineWeight
}

/** Current font size (CSS px) used when drawing measurement badges. */
export function acapGetMeasurementFontSize(): number {
  return measurementDrawFontSize
}

/** Update the session measurement draw color (affects current/future measurements). */
export function acapSetMeasurementDrawColor(color: AcCmColor): void {
  measurementDrawColor = color.clone()
}

/** Update the session measurement draw line weight. */
export function acapSetMeasurementDrawLineWeight(weight: AcGiLineWeight): void {
  if (!Number.isFinite(weight) || weight < 0) return
  measurementDrawLineWeight = weight
}

/** Update the session measurement draw font size (CSS px). */
export function acapSetMeasurementDrawFontSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) return
  measurementDrawFontSize = size
}

/** Restore factory session measurement draw style (tests / document reset). */
export function acapResetMeasurementDrawStyle(): void {
  measurementDrawColor = undefined
  measurementDrawLineWeight = MEASUREMENT_LINE_WEIGHT
  measurementDrawFontSize = MEASUREMENT_FONT_SIZE
}

/** Build a style object from the current measurement draw color / line weight / font size. */
export function acapGetCurrentMeasurementStyle(
  db: AcDbDatabase
): AcApMeasurementStyle {
  return {
    color: acapGetMeasurementColor(db),
    lineWeight: acapGetMeasurementLineWeight(),
    fontSize: acapGetMeasurementFontSize()
  }
}

/** Clone a measurement style (color is cloned). */
export function acapCloneMeasurementStyle(
  style: AcApMeasurementStyle
): AcApMeasurementStyle {
  return {
    color: style.color.clone(),
    lineWeight: style.lineWeight,
    fontSize: style.fontSize
  }
}

/**
 * Map a CAD line weight to a canvas stroke width in CSS pixels.
 *
 * Hairline ({@link OVERLAY_HAIRLINE_LINE_WEIGHT}) returns `0` so overlay
 * painters can keep a 1px screen stroke that does not scale with zoom.
 * {@link AcGiLineWeight.LineWeight070} (70) ≈ 2.5px.
 */
export function acapMeasurementCanvasLineWidth(weight: AcGiLineWeight): number {
  const n = Number(weight)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.max(1, n / 28)
}

/** Converts an AcCmColor to a CSS rgba() string. */
export function acapColorToCssAlpha(c: AcCmColor, alpha: number): string {
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${alpha})`
}

/** Converts an AcCmColor to a CSS hex color string for overlays / sidecars. */
export function acapCssColor(c: AcCmColor): string {
  return acCmColorToCssHex(c)
}

/** Parse a CSS color string back into AcCmColor (best-effort). */
export function acapCssToMeasurementColor(css: string): AcCmColor {
  return parseCssToAcCmColor(css, [123, 135, 148])
}
