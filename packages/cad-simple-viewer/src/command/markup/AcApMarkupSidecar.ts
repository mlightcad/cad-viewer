import { MARKUP_STATUSES } from './AcApMarkupStore'
import type {
  AcApMarkupRecord,
  AcApMarkupSidecarFile,
  AcApMarkupStatus,
  AcApMarkupType
} from './AcApMarkupTypes'

const MARKUP_TYPES: readonly AcApMarkupType[] = [
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
): value is { tip: { x: number; y: number }; anchor: { x: number; y: number }; text?: string } {
  if (!isPlainObject(value)) return false
  if (!isPoint(value.tip) || !isPoint(value.anchor)) return false
  if (value.text !== undefined && typeof value.text !== 'string') return false
  return true
}

function isStatus(value: unknown): value is AcApMarkupStatus {
  return (
    typeof value === 'string' &&
    (MARKUP_STATUSES as readonly string[]).includes(value)
  )
}

function isType(value: unknown): value is AcApMarkupType {
  return (
    typeof value === 'string' &&
    (MARKUP_TYPES as readonly string[]).includes(value)
  )
}

function parseRecord(raw: unknown): AcApMarkupRecord | undefined {
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
      lineWeight:
        typeof raw.style.lineWeight === 'number'
          ? raw.style.lineWeight
          : undefined,
      fontSize:
        typeof raw.style.fontSize === 'number' && raw.style.fontSize > 0
          ? raw.style.fontSize
          : undefined
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
    geometry: raw.geometry as unknown as AcApMarkupRecord['geometry']
  }
}

/**
 * Parse sidecar JSON text into a typed file object.
 * @throws Error when the payload is not valid markup sidecar v1.
 */
export function parseMarkupSidecar(text: string): AcApMarkupSidecarFile {
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
  const markups: AcApMarkupRecord[] = []
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

/** Serialize a sidecar file to pretty-printed JSON. */
export function stringifyMarkupSidecar(file: AcApMarkupSidecarFile): string {
  return `${JSON.stringify(file, null, 2)}\n`
}

/**
 * Suggested sidecar file name for a drawing.
 * @example markupSidecarFileName('plan.dwg') → 'plan.markup.json'
 */
export function markupSidecarFileName(drawingName?: string): string {
  if (!drawingName) return 'drawing.markup.json'
  const base = drawingName.replace(/\.(dwg|dxf)$/i, '')
  return `${base}.markup.json`
}
