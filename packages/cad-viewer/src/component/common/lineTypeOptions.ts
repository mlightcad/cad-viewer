import {
  type AcDbDatabase,
  type AcGiBaseLineStyle
} from '@mlightcad/data-model'

/**
 * Normalized line type metadata consumed by ribbon property controls and
 * standalone selectors.
 */
export interface LineTypeOption {
  /** Stable value written back to the database `CELTYPE` system variable. */
  value: string
  /** User-facing label rendered in the dropdown list. */
  label: string
  /** Optional inline SVG preview generated from the backing line type record. */
  previewSvgString?: string
  /** Optional fallback pattern hint used when a live line type record is absent. */
  pattern?: 'solid' | 'dashed' | 'hidden' | 'center'
  /** Backing CAD line type record used to derive a preview from dash segments. */
  lineType?: AcGiBaseLineStyle
}

const SOLID_LINE_BACKGROUND =
  'linear-gradient(90deg, currentColor, currentColor)'

/**
 * Restricts a numeric value to the inclusive range expected by the preview UI.
 *
 * @param value Value to normalize.
 * @param min Smallest allowed result.
 * @param max Largest allowed result.
 * @returns The input constrained to `[min, max]`.
 */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Infers a preview pattern from explicit metadata or common line type naming.
 *
 * @param option Option whose preview should be resolved.
 * @returns A simplified pattern token understood by the fallback renderer.
 */
function inferNamedPattern(option?: LineTypeOption) {
  if (option?.pattern) return option.pattern

  const normalized =
    `${option?.value ?? ''} ${option?.label ?? ''}`.toLowerCase()
  if (normalized.includes('center')) return 'center'
  if (normalized.includes('hidden')) return 'hidden'
  if (normalized.includes('dash')) return 'dashed'
  return 'solid'
}

/**
 * Converts a CAD line type dash definition into a CSS background preview.
 *
 * @param lineType CAD line type whose pattern segments should be visualized.
 * @returns A CSS gradient string representing the dash and gap sequence.
 */
function buildPatternBackground(lineType: AcGiBaseLineStyle) {
  const rawSegments =
    lineType.pattern
      ?.map(segment => Number(segment.elementLength))
      .filter(length => Number.isFinite(length)) ?? []

  if (!rawSegments.length || !rawSegments.some(length => length < 0)) {
    return SOLID_LINE_BACKGROUND
  }

  const totalLength = rawSegments.reduce(
    (sum, length) => sum + Math.abs(length),
    0
  )
  const scale = totalLength > 0 ? 56 / totalLength : 1

  let offset = 0
  const stops = rawSegments.map(length => {
    const start = offset
    const resolvedLength =
      length === 0
        ? 2
        : clamp(
            Math.abs(length) * scale,
            length > 0 ? 2 : 3,
            length > 0 ? 24 : 18
          )

    offset += resolvedLength

    return `${length >= 0 ? 'currentColor' : 'transparent'} ${start}px ${offset}px`
  })

  return `repeating-linear-gradient(90deg, ${stops.join(', ')})`
}

type PreviewSvgProvider = {
  toPreviewSvgString?: () => string | null | undefined
}

/**
 * Invokes the preview-SVG generator defensively and normalizes blank output.
 *
 * @param provider Potential object carrying `toPreviewSvgString`.
 * @returns Inline SVG markup when available.
 */
function callPreviewSvgString(provider?: PreviewSvgProvider) {
  if (!provider || typeof provider.toPreviewSvgString !== 'function') {
    return undefined
  }

  try {
    const svgString = provider.toPreviewSvgString()
    if (!svgString) return undefined
    const normalized = svgString.trim()
    return normalized.length ? normalized : undefined
  } catch {
    return undefined
  }
}

/**
 * Resolves the optional inline SVG preview from explicit option metadata or the
 * backing CAD line type object.
 *
 * @param option Option to visualize.
 * @returns Inline SVG markup string when available.
 */
export function resolveLineTypePreviewSvg(option?: LineTypeOption) {
  if (!option) return undefined
  return (
    callPreviewSvgString({
      toPreviewSvgString: () => option.previewSvgString
    }) ?? callPreviewSvgString(option.lineType as PreviewSvgProvider)
  )
}

/**
 * Resolves the CSS background used to preview a line type option.
 *
 * @param option Option to visualize. When omitted, a solid fallback is used.
 * @returns A CSS background value that can be bound directly to the preview swatch.
 */
export function resolveLineTypeBackground(option?: LineTypeOption) {
  if (option?.lineType) {
    return buildPatternBackground(option.lineType)
  }

  switch (inferNamedPattern(option)) {
    case 'dashed':
      return 'repeating-linear-gradient(90deg, currentColor 0 18px, transparent 18px 26px)'
    case 'hidden':
      return 'repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 14px)'
    case 'center':
      return 'repeating-linear-gradient(90deg, currentColor 0 24px, transparent 24px 32px, currentColor 32px 40px, transparent 40px 52px)'
    default:
      return SOLID_LINE_BACKGROUND
  }
}

/**
 * Builds a deduplicated and sorted set of selectable line type options from the
 * active drawing database.
 *
 * @param db Active CAD database that owns the line type table.
 * @returns Dropdown-ready options, with `Continuous` promoted to the top when present.
 */
export function buildLineTypeOptions(db?: AcDbDatabase): LineTypeOption[] {
  if (!db) return []

  const options: LineTypeOption[] = []
  const seen = new Set<string>()

  for (const record of db.tables.linetypeTable.newIterator()) {
    const name = record.name || record.linetype.name
    if (!name || seen.has(name)) continue

    seen.add(name)
    const previewSvgString =
      callPreviewSvgString(record as PreviewSvgProvider) ??
      callPreviewSvgString(record.linetype as PreviewSvgProvider)

    options.push({
      value: name,
      label: name,
      previewSvgString,
      lineType: record.linetype
    })
  }

  options.sort((a, b) => {
    const aIsContinuous = a.value.toLowerCase() === 'continuous'
    const bIsContinuous = b.value.toLowerCase() === 'continuous'
    if (aIsContinuous !== bIsContinuous) {
      return aIsContinuous ? -1 : 1
    }
    return a.label.localeCompare(b.label)
  })

  return options
}
