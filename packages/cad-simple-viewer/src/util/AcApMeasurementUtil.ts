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
 * Drawn as 1 CSS pixel and not scaled with zoom.
 */
export const OVERLAY_HAIRLINE_LINE_WEIGHT = 0 as AcGiLineWeight

/** Factory default CAD line weight for measurement geometry. */
export const MEASUREMENT_LINE_WEIGHT = OVERLAY_HAIRLINE_LINE_WEIGHT

/** Factory default screen font size (CSS px) for measurement badges. */
export const MEASUREMENT_FONT_SIZE = 13

/** Authoring mode for measurement / markup text height. */
export type AcApTextHeightMode = 'adaptive' | 'custom'

/** Session draw color for newly created measurements (undefined = use sysvar). */
let measurementDrawColor: AcCmColor | undefined

/** Session draw font size for newly created measurement badges. */
let measurementDrawFontSize = MEASUREMENT_FONT_SIZE

/** Session text-height authoring mode. */
let measurementTextHeightMode: AcApTextHeightMode = 'adaptive'

/** Session custom WCS text height when mode is `'custom'`. */
let measurementCustomTextHeightWcs: number | undefined

/** Visual style stored on a committed measurement group. */
export interface AcApMeasurementStyle {
  color: AcCmColor
  lineWeight: AcGiLineWeight
  fontSize: number
  /** Authoring mode; omitted means adaptive (legacy). */
  textHeightMode?: AcApTextHeightMode
  /** World-space text height when {@link textHeightMode} is `'custom'`. */
  textHeightWcs?: number
}

/** Returns the current measurement overlay color (session override or MEASUREMENTCOLOR). */
export function acapGetMeasurementColor(db: AcDbDatabase): AcCmColor {
  if (measurementDrawColor) return measurementDrawColor.clone()
  return AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.MEASUREMENTCOLOR,
    db
  ) as AcCmColor
}

/** Current font size (CSS px) used when drawing measurement badges. */
export function acapGetMeasurementFontSize(): number {
  return measurementDrawFontSize
}

/** Update the session measurement draw color (affects current/future measurements). */
export function acapSetMeasurementDrawColor(color: AcCmColor): void {
  measurementDrawColor = color.clone()
}

/** Update the session measurement draw font size (CSS px). */
export function acapSetMeasurementDrawFontSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) return
  measurementDrawFontSize = size
  measurementTextHeightMode = 'adaptive'
  measurementCustomTextHeightWcs = undefined
}

/** Current measurement text-height authoring mode. */
export function acapGetMeasurementTextHeightMode(): AcApTextHeightMode {
  return measurementTextHeightMode
}

/** Custom WCS text height for the measurement draw session, if any. */
export function acapGetMeasurementCustomTextHeightWcs(): number | undefined {
  return measurementCustomTextHeightWcs
}

/**
 * Sets adaptive (screen) or custom (WCS) text height for new measurements.
 *
 * @param mode - Authoring mode.
 * @param value - Font size px when adaptive; WCS height when custom.
 */
export function acapSetMeasurementTextHeight(
  mode: AcApTextHeightMode,
  value: number
): void {
  if (!Number.isFinite(value) || value <= 0) return
  measurementTextHeightMode = mode
  if (mode === 'adaptive') {
    measurementDrawFontSize = value
    measurementCustomTextHeightWcs = undefined
    return
  }
  measurementCustomTextHeightWcs = value
}

/** Restore factory session measurement draw style (tests / document reset). */
export function acapResetMeasurementDrawStyle(): void {
  measurementDrawColor = undefined
  measurementDrawFontSize = MEASUREMENT_FONT_SIZE
  measurementTextHeightMode = 'adaptive'
  measurementCustomTextHeightWcs = undefined
}

/** Build a style object from the current measurement draw color / font size. */
export function acapGetCurrentMeasurementStyle(
  db: AcDbDatabase
): AcApMeasurementStyle {
  return {
    color: acapGetMeasurementColor(db),
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: acapGetMeasurementFontSize(),
    textHeightMode: measurementTextHeightMode,
    ...(measurementTextHeightMode === 'custom' &&
    measurementCustomTextHeightWcs != null &&
    measurementCustomTextHeightWcs > 0
      ? { textHeightWcs: measurementCustomTextHeightWcs }
      : {})
  }
}

/** Clone a measurement style (color is cloned). */
export function acapCloneMeasurementStyle(
  style: AcApMeasurementStyle
): AcApMeasurementStyle {
  return {
    color: style.color.clone(),
    lineWeight: style.lineWeight,
    fontSize: style.fontSize,
    textHeightMode: style.textHeightMode,
    textHeightWcs: style.textHeightWcs
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
