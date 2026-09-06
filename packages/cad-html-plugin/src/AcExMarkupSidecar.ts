/**
 * Markup sidecar JSON parse / stringify for the offline HTML viewer.
 * Compatible with cad-simple-viewer `AcApMarkupSidecar` v1.
 *
 * @module AcExMarkupSidecar
 * @packageDocumentation
 */

import type {
  AcExMarkupRecord,
  AcExMarkupSidecarFile,
  AcExMarkupStatus,
  AcExMarkupStyle,
  AcExMarkupType
} from './AcExMarkupTypes'

/** Overlay line weight: hairline (1 CSS px, not zoom-scaled). */
const ACEX_MARKUP_LINE_WEIGHT = 0

const MARKUP_STATUSES: readonly AcExMarkupStatus[] = [
  'open',
  'question',
  'answered',
  'closed'
]

const MARKUP_TYPES: readonly AcExMarkupType[] = [
  'text',
  'line',
  'arrow',
  'cloud',
  'rect',
  'circle',
  'highlight',
  'callout',
  'stamp',
  'symbol'
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return (
    isPlainObject(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number'
  )
}

function isAttachedCallout(
  value: unknown
): value is {
  tip: { x: number; y: number }
  anchor: { x: number; y: number }
  text?: string
} {
  if (!isPlainObject(value)) return false
  if (!isPoint(value.tip) || !isPoint(value.anchor)) return false
  if (value.text !== undefined && typeof value.text !== 'string') return false
  return true
}

function isStatus(value: unknown): value is AcExMarkupStatus {
  return (
    typeof value === 'string' &&
    (MARKUP_STATUSES as readonly string[]).includes(value)
  )
}

function isType(value: unknown): value is AcExMarkupType {
  return (
    typeof value === 'string' &&
    (MARKUP_TYPES as readonly string[]).includes(value)
  )
}

function parsePositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 && Number.isFinite(value)
    ? value
    : undefined
}

function parseRecord(raw: unknown): AcExMarkupRecord | undefined {
  if (!isPlainObject(raw)) return undefined
  if (typeof raw.id !== 'string' || !isType(raw.type)) return undefined
  if (!isPlainObject(raw.style) || typeof raw.style.color !== 'string') {
    return undefined
  }
  if (!isPlainObject(raw.geometry) || raw.geometry.type !== raw.type) {
    return undefined
  }
  if (!isStatus(raw.status)) return undefined

  const geometry = raw.geometry as Record<string, unknown>
  switch (raw.type) {
    case 'text':
      if (!isPoint(geometry.position)) return undefined
      break
    case 'line':
    case 'arrow':
      if (!isPoint(geometry.start) || !isPoint(geometry.end)) return undefined
      break
    case 'cloud':
    case 'rect':
    case 'highlight':
      if (!isPoint(geometry.corner1) || !isPoint(geometry.corner2)) {
        return undefined
      }
      if (
        (raw.type === 'cloud' || raw.type === 'rect') &&
        geometry.callout !== undefined &&
        !isAttachedCallout(geometry.callout)
      ) {
        return undefined
      }
      break
    case 'circle':
      if (
        !isPoint(geometry.center) ||
        typeof geometry.radius !== 'number' ||
        !(geometry.radius > 0)
      ) {
        return undefined
      }
      if (
        geometry.callout !== undefined &&
        !isAttachedCallout(geometry.callout)
      ) {
        return undefined
      }
      break
    case 'callout':
      if (!isPoint(geometry.tip) || !isPoint(geometry.anchor)) return undefined
      break
    case 'stamp':
      if (!isPoint(geometry.position) || typeof geometry.stampId !== 'string') {
        return undefined
      }
      break
    case 'symbol':
      if (
        !isPoint(geometry.position) ||
        typeof geometry.symbolId !== 'string'
      ) {
        return undefined
      }
      break
    default:
      return undefined
  }

  return {
    id: raw.id,
    type: raw.type,
    layoutId: typeof raw.layoutId === 'string' ? raw.layoutId : undefined,
    style: {
      color: raw.style.color,
      // Accept legacy lineWeight / strokeWidthWcs without failing, but always hairline.
      lineWeight: ACEX_MARKUP_LINE_WEIGHT,
      fontSize:
        typeof raw.style.fontSize === 'number' && raw.style.fontSize > 0
          ? raw.style.fontSize
          : undefined,
      textHeightMode:
        raw.style.textHeightMode === 'custom' ||
        raw.style.textHeightMode === 'adaptive'
          ? raw.style.textHeightMode
          : undefined,
      textHeightWcs: parsePositiveNumber(raw.style.textHeightWcs),
      arrowSizeWcs: parsePositiveNumber(raw.style.arrowSizeWcs)
    },
    text: typeof raw.text === 'string' ? raw.text : undefined,
    comment: typeof raw.comment === 'string' ? raw.comment : '',
    status: raw.status,
    author: typeof raw.author === 'string' ? raw.author : '',
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : new Date().toISOString(),
    geometry: raw.geometry as unknown as AcExMarkupRecord['geometry']
  }
}

/**
 * Parse sidecar JSON text into a typed file object.
 * @throws Error when the payload is not valid markup sidecar v1.
 */
export function parseAcExMarkupSidecar(text: string): AcExMarkupSidecarFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid markup sidecar: not JSON')
  }
  if (!isPlainObject(parsed) || parsed.version !== 1) {
    throw new Error('Invalid markup sidecar: expected version 1')
  }
  if (!Array.isArray(parsed.markups)) {
    throw new Error('Invalid markup sidecar: markups must be an array')
  }
  const markups: AcExMarkupRecord[] = []
  for (const item of parsed.markups) {
    const record = parseRecord(item)
    if (record) markups.push(record)
  }
  return {
    version: 1,
    drawingName:
      typeof parsed.drawingName === 'string' ? parsed.drawingName : undefined,
    markups
  }
}

function normalizeStyleForWrite(style: AcExMarkupStyle): AcExMarkupStyle {
  const { strokeWidthWcs: _ignored, ...rest } = style
  return {
    ...rest,
    lineWeight: ACEX_MARKUP_LINE_WEIGHT
  }
}

/** Serialize a sidecar file to pretty-printed JSON. */
export function stringifyAcExMarkupSidecar(
  file: AcExMarkupSidecarFile
): string {
  const normalized: AcExMarkupSidecarFile = {
    ...file,
    markups: file.markups.map(m => ({
      ...m,
      style: normalizeStyleForWrite(m.style)
    }))
  }
  return `${JSON.stringify(normalized, null, 2)}\n`
}

/**
 * Suggested sidecar file name for a drawing.
 * @example acexMarkupSidecarFileName('plan.dwg') → 'plan.markup.json'
 */
export function acexMarkupSidecarFileName(drawingName?: string): string {
  if (!drawingName) return 'drawing.markup.json'
  const base = drawingName.replace(/\.(dwg|dxf|html)$/i, '')
  return `${base}.markup.json`
}
