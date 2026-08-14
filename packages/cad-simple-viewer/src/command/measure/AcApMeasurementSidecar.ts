import { AcGiLineWeight } from '@mlightcad/data-model'

import {
  acapCssColor,
  acapCssToMeasurementColor,
  type AcApMeasurementStyle,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../../util/AcApMeasurementUtil'
import type {
  AcApMeasurementGeometry,
  AcApMeasurementPoint2d,
  AcApMeasurementRecord,
  AcApMeasurementSidecarFile,
  AcApMeasurementSidecarStyle,
  AcApMeasurementType
} from './AcApMeasurementTypes'

const MEASUREMENT_TYPES: readonly AcApMeasurementType[] = [
  'distance',
  'angle',
  'area',
  'arc',
  'point'
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPoint(value: unknown): value is AcApMeasurementPoint2d {
  return (
    isPlainObject(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y)
  )
}

function isType(value: unknown): value is AcApMeasurementType {
  return (
    typeof value === 'string' &&
    (MEASUREMENT_TYPES as readonly string[]).includes(value)
  )
}

function parseStyle(raw: unknown): AcApMeasurementSidecarStyle | undefined {
  if (!isPlainObject(raw) || typeof raw.color !== 'string') return undefined
  const lineWeight =
    typeof raw.lineWeight === 'number' && raw.lineWeight > 0
      ? (raw.lineWeight as AcGiLineWeight)
      : MEASUREMENT_LINE_WEIGHT
  const fontSize =
    typeof raw.fontSize === 'number' && raw.fontSize > 0
      ? raw.fontSize
      : MEASUREMENT_FONT_SIZE
  return { color: raw.color, lineWeight, fontSize }
}

function parseGeometry(
  type: AcApMeasurementType,
  raw: unknown
): AcApMeasurementGeometry | undefined {
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
        end: raw.end
      }
    case 'point':
      if (!isPoint(raw.position)) return undefined
      return { type, position: raw.position }
  }
}

function parseRecord(raw: unknown): AcApMeasurementRecord | undefined {
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

/** Serialize a live measurement style for the sidecar. */
export function serializeMeasurementStyle(
  style: AcApMeasurementStyle
): AcApMeasurementSidecarStyle {
  return {
    color: acapCssColor(style.color),
    lineWeight: style.lineWeight,
    fontSize: style.fontSize
  }
}

/** Restore a live measurement style from sidecar CSS / numeric fields. */
export function deserializeMeasurementStyle(
  style: AcApMeasurementSidecarStyle
): AcApMeasurementStyle {
  return {
    color: acapCssToMeasurementColor(style.color),
    lineWeight:
      style.lineWeight > 0 ? style.lineWeight : MEASUREMENT_LINE_WEIGHT,
    fontSize: style.fontSize > 0 ? style.fontSize : MEASUREMENT_FONT_SIZE
  }
}

/**
 * Parse sidecar JSON text into a typed file object.
 * @throws Error when the payload is not valid measurement sidecar v1.
 */
export function parseMeasurementSidecar(
  text: string
): AcApMeasurementSidecarFile {
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
    throw new Error('Invalid measurement sidecar: measurements must be an array')
  }
  const measurements: AcApMeasurementRecord[] = []
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

/** Serialize a sidecar file to pretty-printed JSON. */
export function stringifyMeasurementSidecar(
  file: AcApMeasurementSidecarFile
): string {
  return `${JSON.stringify(file, null, 2)}\n`
}

/**
 * Suggested sidecar file name for a drawing.
 * @example measurementSidecarFileName('plan.dwg') → 'plan.measurement.json'
 */
export function measurementSidecarFileName(drawingName?: string): string {
  if (!drawingName) return 'drawing.measurement.json'
  const base = drawingName.replace(/\.(dwg|dxf)$/i, '')
  return `${base}.measurement.json`
}
