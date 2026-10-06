/**
 * Small, PDF.js-agnostic helpers for mapping Optional Content Groups (OCGs)
 * to CAD layer names.
 *
 * Keeping these helpers independent from pdfjs-dist makes the layer-mapping
 * behavior easy to unit test without loading the PDF worker/runtime.
 */

export const PDF_FALLBACK_LAYER = 'PDF_UNGROUPED'

/** AutoCAD symbol-table names are limited to 255 characters. */
const CAD_LAYER_NAME_MAX = 255

export interface PdfOperatorListLike {
  fnArray: ArrayLike<number>
  argsArray: ArrayLike<unknown>
}

export interface PdfOptionalContentGroupLike {
  name?: unknown
  visible?: unknown
}

export interface PdfOptionalContentVisibilityInput {
  type?: string
  id?: string
}

export interface PdfOptionalContentConfigLike {
  getGroup?: (id: string) => PdfOptionalContentGroupLike | null | undefined
  /**
   * PDF.js `OptionalContentConfig.isVisible`. Honors OCG state and OCMD policy.
   * Layer on/off for a single group uses this when the host provides it.
   */
  isVisible?: (group: PdfOptionalContentVisibilityInput) => boolean
}

export interface PdfOcgLayerInfo {
  id: string
  layerName: string
  visible: boolean
}

/**
 * How one `beginMarkedContentProps` argument list should affect the CAD layer.
 *
 * - `ocg` — a single optional-content group, mapped to its own layer
 * - `fallback` — optional content that is not one group (OCMD with several
 *   groups, a visibility expression, or an unreadable OC dictionary)
 * - `none` — marked content that is not optional content
 */
export type PdfMarkedContentTarget =
  | { kind: 'ocg'; id: string }
  | { kind: 'fallback' }
  | { kind: 'none' }

const INVALID_CAD_LAYER_CHARS = /[<>/\\":;?*|=,]/g

/**
 * Symbol-table identity for a CAD layer name.
 *
 * Matches `AcDbSymbolTable.normalizeName`: trim, then compare case-insensitively.
 */
export function normalizeCadLayerKey(name: string): string {
  return name.trim().toUpperCase()
}

/**
 * Classifies a PDF.js `beginMarkedContentProps` argument list.
 */
export function getPdfMarkedContentTarget(
  args: readonly unknown[]
): PdfMarkedContentTarget {
  if (args[0] !== 'OC') return { kind: 'none' }

  const properties = args[1]

  if (typeof properties === 'string' || typeof properties === 'number') {
    const id = String(properties).trim()
    return id ? { kind: 'ocg', id } : { kind: 'fallback' }
  }

  if (!properties || typeof properties !== 'object') {
    return { kind: 'fallback' }
  }

  const record = properties as {
    type?: unknown
    id?: unknown
    ids?: unknown
  }
  const type = typeof record.type === 'string' ? record.type : undefined
  const ids = readIdList(record.ids)
  const singleId = readId(record.id)

  if (type === 'OCMD') {
    if (ids.length === 1) return { kind: 'ocg', id: ids[0] }
    if (ids.length > 1) return { kind: 'fallback' }
    if (singleId) return { kind: 'ocg', id: singleId }
    return { kind: 'fallback' }
  }

  if (ids.length > 1) return { kind: 'fallback' }
  if (ids.length === 1) return { kind: 'ocg', id: ids[0] }
  if (singleId) return { kind: 'ocg', id: singleId }
  return { kind: 'fallback' }
}

/**
 * Returns the OCG id encoded by a PDF.js beginMarkedContentProps argument list.
 *
 * Membership dictionaries that reference more than one group return `undefined`.
 * Use {@link getPdfMarkedContentTarget} when that content still needs the
 * fallback layer.
 */
export function getPdfOcgIdFromMarkedContentArgs(
  args: readonly unknown[]
): string | undefined {
  const target = getPdfMarkedContentTarget(args)
  return target.kind === 'ocg' ? target.id : undefined
}

/**
 * Converts an arbitrary PDF OCG label into a CAD-safe layer name.
 */
export function sanitizePdfLayerName(name: string): string {
  return name.replace(INVALID_CAD_LAYER_CHARS, '_').trim().slice(0, CAD_LAYER_NAME_MAX)
}

function normalizeArgs(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function readId(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const id = String(value).trim()
  return id || undefined
}

function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  for (const entry of value) {
    const id = readId(entry)
    if (id) ids.push(id)
  }
  return ids
}

function claimLayerName(name: string, usedKeys: Set<string>): string | undefined {
  const trimmed = name.trim().slice(0, CAD_LAYER_NAME_MAX)
  if (!trimmed) return undefined
  const key = normalizeCadLayerKey(trimmed)
  if (!key || usedKeys.has(key)) return undefined
  usedKeys.add(key)
  return trimmed
}

function withSuffix(base: string, suffix: string): string {
  const stemBudget = Math.max(1, CAD_LAYER_NAME_MAX - suffix.length)
  return `${base.slice(0, stemBudget)}${suffix}`
}

function allocateUniqueLayerName(
  preferredName: string,
  id: string,
  usedKeys: Set<string>
): string {
  const fallback = `PDF_OCG_${sanitizePdfLayerName(id) || 'GROUP'}`
  const base = sanitizePdfLayerName(preferredName) || fallback

  const direct = claimLayerName(base, usedKeys)
  if (direct) return direct

  const idSuffix = sanitizePdfLayerName(id)
  const suffix = idSuffix ? `_${idSuffix}` : '_2'
  const suffixed = claimLayerName(withSuffix(base, suffix), usedKeys)
  if (suffixed) return suffixed

  let index = 2
  while (index < 100000) {
    const claimed = claimLayerName(
      withSuffix(base, `${suffix}_${index}`),
      usedKeys
    )
    if (claimed) return claimed
    index++
  }

  const emergency = `PDF_OCG_${index}`.slice(0, CAD_LAYER_NAME_MAX)
  usedKeys.add(normalizeCadLayerKey(emergency))
  return emergency
}

function ocgInitiallyVisible(
  config: PdfOptionalContentConfigLike,
  id: string,
  group: PdfOptionalContentGroupLike | null | undefined
): boolean {
  if (config.isVisible) {
    return config.isVisible({ type: 'OCG', id }) !== false
  }
  return group?.visible !== false
}

/**
 * True when the page operator list references optional content, including
 * membership dictionaries that do not map to a single CAD layer.
 */
export function pdfOperatorListHasOptionalContent(
  opList: PdfOperatorListLike,
  beginMarkedContentPropsOp: number
): boolean {
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== beginMarkedContentPropsOp) continue
    const target = getPdfMarkedContentTarget(normalizeArgs(opList.argsArray[i]))
    if (target.kind !== 'none') return true
  }
  return false
}

/**
 * Finds OCG ids referenced by a page operator list and resolves each id to a
 * unique CAD layer name plus its initial display visibility.
 *
 * Names already present in `reservedLayerNames` (the drawing's layer table)
 * and {@link PDF_FALLBACK_LAYER} are not reused. Comparison follows CAD
 * symbol-table rules, so `Walls` and `walls` are the same layer.
 */
export function collectPdfOcgLayers(
  opList: PdfOperatorListLike,
  beginMarkedContentPropsOp: number,
  optionalContentConfig: PdfOptionalContentConfigLike,
  reservedLayerNames: Iterable<string> = []
): Map<string, PdfOcgLayerInfo> {
  const ids: string[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== beginMarkedContentPropsOp) continue

    const target = getPdfMarkedContentTarget(normalizeArgs(opList.argsArray[i]))
    if (target.kind !== 'ocg' || seenIds.has(target.id)) continue

    seenIds.add(target.id)
    ids.push(target.id)
  }

  const usedKeys = new Set<string>([normalizeCadLayerKey(PDF_FALLBACK_LAYER)])
  for (const name of reservedLayerNames) {
    const key = normalizeCadLayerKey(name)
    if (key) usedKeys.add(key)
  }

  const result = new Map<string, PdfOcgLayerInfo>()

  for (const id of ids) {
    const group = optionalContentConfig.getGroup?.(id)
    const rawName =
      typeof group?.name === 'string' && group.name.trim()
        ? group.name.trim()
        : `PDF_OCG_${id}`

    result.set(id, {
      id,
      layerName: allocateUniqueLayerName(rawName, id, usedKeys),
      visible: ocgInitiallyVisible(optionalContentConfig, id, group)
    })
  }

  return result
}

/**
 * Layer name for vector geometry that is not assigned to a single OCG.
 *
 * Uses {@link PDF_FALLBACK_LAYER} when that name is free. Otherwise allocates
 * a suffixed name so an existing drawing layer is left unchanged.
 */
export function allocatePdfFallbackLayerName(
  reservedLayerNames: Iterable<string>,
  ocgLayerNames: Iterable<string>
): string {
  const usedKeys = new Set<string>()
  for (const name of [...reservedLayerNames, ...ocgLayerNames]) {
    const key = normalizeCadLayerKey(name)
    if (key) usedKeys.add(key)
  }

  const canonical = claimLayerName(PDF_FALLBACK_LAYER, usedKeys)
  if (canonical) return canonical
  return allocateUniqueLayerName(PDF_FALLBACK_LAYER, '2', usedKeys)
}
