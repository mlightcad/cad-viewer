/**
 * Measurement sidecar JSON parse / stringify for the offline HTML viewer.
 * Compatible with cad-simple-viewer `AcApMeasurementSidecar` v1.
 *
 * @module AcExMeasurementSidecar
 * @packageDocumentation
 */

import type {
  AcExMeasurementGeometry,
  AcExMeasurementPoint2d,
  AcExMeasurementRecord,
  AcExMeasurementSidecarFile,
  AcExMeasurementSidecarStyle,
  AcExMeasurementType
} from './AcExMeasurementTypes'

/** Default overlay line weight: hairline (1 CSS px, not zoom-scaled). */
export const ACEX_MEASUREMENT_LINE_WEIGHT = 0

/** Default badge font size in CSS pixels (matches simple-viewer). */
export const ACEX_MEASUREMENT_FONT_SIZE = 13

/** Map CAD line weight to canvas stroke width in CSS pixels. */
export function acexMeasureCanvasLineWidth(weight?: number): number {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return 0
  return Math.max(1, weight / 28)
}

const MEASUREMENT_TYPES: readonly AcExMeasurementType[] = [
  'distance',
  'angle',
  'area',
  'arc',
  'point'
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPoint(value: unknown): value is AcExMeasurementPoint2d {
  return (
    isPlainObject(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y)
  )
}

function isType(value: unknown): value is AcExMeasurementType {
  return (
    typeof value === 'string' &&
    (MEASUREMENT_TYPES as readonly string[]).includes(value)
  )
}

function parsePositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 && Number.isFinite(value)
    ? value
    : undefined
}

function parseStyle(raw: unknown): AcExMeasurementSidecarStyle | undefined {
  if (!isPlainObject(raw) || typeof raw.color !== 'string') return undefined
  // Accept legacy lineWeight / strokeWidthWcs without failing, but always hairline.
  const fontSize =
    typeof raw.fontSize === 'number' && raw.fontSize > 0
      ? raw.fontSize
      : ACEX_MEASUREMENT_FONT_SIZE
  return {
    color: raw.color,
    lineWeight: ACEX_MEASUREMENT_LINE_WEIGHT,
    fontSize,
    textHeightMode:
      raw.textHeightMode === 'custom' || raw.textHeightMode === 'adaptive'
        ? raw.textHeightMode
        : undefined,
    textHeightWcs: parsePositiveNumber(raw.textHeightWcs),
    arrowSizeWcs: parsePositiveNumber(raw.arrowSizeWcs)
  }
}

function parseGeometry(
  type: AcExMeasurementType,
  raw: unknown
): AcExMeasurementGeometry | undefined {
  if (!isPlainObject(raw) || raw.type !== type) return undefined
  switch (type) {
    case 'distance':
      if (!isPoint(raw.start) || !isPoint(raw.end)) return undefined
      return { type, start: raw.start, end: raw.end }
    case 'angle':
      if (!isPoint(raw.vertex) || !isPoint(raw.arm1) || !isPoint(raw.arm2)) {
        return undefined
      }
      return { type, vertex: raw.vertex, arm1: raw.arm1, arm2: raw.arm2 }
    case 'area':
      if (!Array.isArray(raw.points) || raw.points.length < 3) return undefined
      if (!raw.points.every(isPoint)) return undefined
      return { type, points: raw.points }
    case 'arc':
      if (
        !isPoint(raw.center) ||
        typeof raw.radius !== 'number' ||
        !(raw.radius > 0) ||
        !isPoint(raw.start) ||
        !isPoint(raw.end)
      ) {
        return undefined
      }
      return {
        type,
        center: raw.center,
        radius: raw.radius,
        start: raw.start,
        end: raw.end,
        ...(isPoint(raw.through) ? { through: raw.through } : {})
      }
    case 'point':
      if (!isPoint(raw.position)) return undefined
      return { type, position: raw.position }
  }
}

function parseRecord(raw: unknown): AcExMeasurementRecord | undefined {
  if (!isPlainObject(raw)) return undefined
  if (typeof raw.id !== 'string' || !isType(raw.type)) return undefined
  const style = parseStyle(raw.style)
  const geometry = parseGeometry(raw.type, raw.geometry)
  if (!style || !geometry) return undefined
  return {
    id: raw.id,
    type: raw.type,
    layoutId: typeof raw.layoutId === 'string' ? raw.layoutId : undefined,
    style,
    geometry
  }
}

/**
 * Parse sidecar JSON text into a typed file object.
 * @throws Error when the payload is not valid measurement sidecar v1.
 */
export function parseAcExMeasurementSidecar(
  text: string
): AcExMeasurementSidecarFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid measurement sidecar: not JSON')
  }
  if (!isPlainObject(parsed) || parsed.version !== 1) {
    throw new Error('Invalid measurement sidecar: expected version 1')
  }
  if (!Array.isArray(parsed.measurements)) {
    throw new Error(
      'Invalid measurement sidecar: measurements must be an array'
    )
  }
  const measurements: AcExMeasurementRecord[] = []
  for (const item of parsed.measurements) {
    const record = parseRecord(item)
    if (record) measurements.push(record)
  }
  return {
    version: 1,
    drawingName:
      typeof parsed.drawingName === 'string' ? parsed.drawingName : undefined,
    measurements
  }
}

function normalizeStyleForWrite(
  style: AcExMeasurementSidecarStyle
): AcExMeasurementSidecarStyle {
  const { strokeWidthWcs: _ignored, ...rest } = style
  return {
    ...rest,
    lineWeight: ACEX_MEASUREMENT_LINE_WEIGHT
  }
}

/** Serialize a sidecar file to pretty-printed JSON. */
export function stringifyAcExMeasurementSidecar(
  file: AcExMeasurementSidecarFile
): string {
  const normalized: AcExMeasurementSidecarFile = {
    ...file,
    measurements: file.measurements.map(m => ({
      ...m,
      style: normalizeStyleForWrite(m.style)
    }))
  }
  return `${JSON.stringify(normalized, null, 2)}\n`
}

/**
 * Suggested sidecar file name for a drawing.
 * @example acexMeasurementSidecarFileName('plan.dwg') → 'plan.measurement.json'
 */
export function acexMeasurementSidecarFileName(drawingName?: string): string {
  if (!drawingName) return 'drawing.measurement.json'
  const base = drawingName.replace(/\.(dwg|dxf|html)$/i, '')
  return `${base}.measurement.json`
}
