/**
 * Small, PDF.js-agnostic helpers for mapping Optional Content Groups (OCGs)
 * to CAD layer names.
 *
 * Keeping these helpers independent from pdfjs-dist makes the layer-mapping
 * behavior easy to unit test without loading the PDF worker/runtime.
 */

export const PDF_FALLBACK_LAYER = 'PDF_UNGROUPED'

export interface PdfOperatorListLike {
  fnArray: ArrayLike<number>
  argsArray: ArrayLike<unknown>
}

export interface PdfOptionalContentGroupLike {
  name?: unknown
  visible?: unknown
}

export interface PdfOptionalContentConfigLike {
  getGroup?: (id: string) => PdfOptionalContentGroupLike | null | undefined
}

export interface PdfOcgLayerInfo {
  id: string
  layerName: string
  visible: boolean
}

const INVALID_CAD_LAYER_CHARS = /[<>/\\":;?*|=,]/g

/**
 * Returns the OCG id encoded by a PDF.js beginMarkedContentProps argument list.
 */
export function getPdfOcgIdFromMarkedContentArgs(
  args: readonly unknown[]
): string | undefined {
  if (args[0] !== 'OC') return undefined

  const properties = args[1]

  if (typeof properties === 'string' || typeof properties === 'number') {
    const id = String(properties).trim()
    return id || undefined
  }

  if (!properties || typeof properties !== 'object' || !('id' in properties)) {
    return undefined
  }

  const id = (properties as { id?: unknown }).id
  if (typeof id !== 'string' && typeof id !== 'number') {
    return undefined
  }

  const normalized = String(id).trim()
  return normalized || undefined
}

/**
 * Converts an arbitrary PDF OCG label into a CAD-safe layer name.
 */
export function sanitizePdfLayerName(name: string): string {
  return name.replace(INVALID_CAD_LAYER_CHARS, '_').trim().slice(0, 255)
}

function normalizeArgs(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function allocateUniqueLayerName(
  preferredName: string,
  id: string,
  usedNames: Set<string>
): string {
  const fallback = `PDF_OCG_${sanitizePdfLayerName(id) || 'GROUP'}`
  const base = sanitizePdfLayerName(preferredName) || fallback

  if (!usedNames.has(base)) {
    usedNames.add(base)
    return base
  }

  const idSuffix = sanitizePdfLayerName(id)
  const suffixedBase = idSuffix ? `${base}_${idSuffix}` : `${base}_2`

  if (!usedNames.has(suffixedBase)) {
    usedNames.add(suffixedBase)
    return suffixedBase
  }

  let index = 2
  let candidate = `${suffixedBase}_${index}`
  while (usedNames.has(candidate)) {
    index++
    candidate = `${suffixedBase}_${index}`
  }

  usedNames.add(candidate)
  return candidate
}

/**
 * Finds OCG ids referenced by a page operator list and resolves each id to a
 * unique CAD layer name plus its initial display visibility.
 */
export function collectPdfOcgLayers(
  opList: PdfOperatorListLike,
  beginMarkedContentPropsOp: number,
  optionalContentConfig: PdfOptionalContentConfigLike
): Map<string, PdfOcgLayerInfo> {
  const ids: string[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== beginMarkedContentPropsOp) continue

    const id = getPdfOcgIdFromMarkedContentArgs(
      normalizeArgs(opList.argsArray[i])
    )
    if (!id || seenIds.has(id)) continue

    seenIds.add(id)
    ids.push(id)
  }

  const usedLayerNames = new Set<string>([PDF_FALLBACK_LAYER])
  const result = new Map<string, PdfOcgLayerInfo>()

  for (const id of ids) {
    const group = optionalContentConfig.getGroup?.(id)
    const rawName =
      typeof group?.name === 'string' && group.name.trim()
        ? group.name.trim()
        : `PDF_OCG_${id}`

    result.set(id, {
      id,
      layerName: allocateUniqueLayerName(rawName, id, usedLayerNames),
      visible: group?.visible !== false
    })
  }

  return result
}
