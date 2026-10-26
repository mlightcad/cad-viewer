import {
  type AcDbDatabase,
  type AcDbLinetypePreviewSvgOptions,
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
  /**
   * Object that can produce an SVG preview (typically `AcDbLinetypeTableRecord`).
   * Kept separate from {@link lineType} because `record.linetype` is only a
   * plain style snapshot and does not expose `toPreviewSvgString`.
   */
  previewSvgProvider?: LineTypePreviewSvgProvider
}

/**
 * Matches the ribbon / select preview swatch (96×20). Sized like the
 * data-model example preview so embedded TEXT glyphs stay legible.
 */
const LINE_TYPE_PREVIEW_SVG_OPTIONS: AcDbLinetypePreviewSvgOptions = {
  width: 192,
  height: 40,
  padding: 6,
  strokeWidth: 1.5
}

const SOLID_LINE_BACKGROUND =
  'linear-gradient(90deg, currentColor, currentColor)'

/** DXF group 74 bit: embedded text in a complex linetype. */
const COMPLEX_LTYPE_TEXT = 2

const previewSvgCache = new WeakMap<object, string | undefined>()

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

/**
 * Object capable of generating an inline SVG linetype preview.
 */
export type LineTypePreviewSvgProvider = {
  toPreviewSvgString?: (
    options?: AcDbLinetypePreviewSvgOptions
  ) => string | null | undefined
}

/**
 * Invokes the preview-SVG generator defensively and normalizes blank output.
 *
 * @param provider Potential object carrying `toPreviewSvgString`.
 * @param options Optional SVG sizing / styling overrides.
 * @returns Inline SVG markup when available.
 */
function callPreviewSvgString(
  provider?: LineTypePreviewSvgProvider,
  options?: AcDbLinetypePreviewSvgOptions
) {
  if (!provider || typeof provider.toPreviewSvgString !== 'function') {
    return undefined
  }

  try {
    const svgString = provider.toPreviewSvgString(options)
    if (!svgString) return undefined
    const normalized = svgString.trim()
    return normalized.length ? normalized : undefined
  } catch {
    return undefined
  }
}

/**
 * Returns whether a line style pattern embeds TEXT elements that CSS dash
 * previews cannot represent.
 *
 * @param lineType CAD line style to inspect.
 */
export function lineTypeHasEmbeddedText(lineType?: AcGiBaseLineStyle) {
  return (
    lineType?.pattern?.some(
      element =>
        ((element.elementTypeFlag ?? 0) & COMPLEX_LTYPE_TEXT) !== 0 &&
        typeof element.text === 'string' &&
        element.text.trim().length > 0
    ) ?? false
  )
}

/**
 * Resolves the optional inline SVG preview from explicit option metadata or the
 * backing CAD line type table record.
 *
 * @param option Option to visualize.
 * @returns Inline SVG markup string when available.
 */
export function resolveLineTypePreviewSvg(option?: LineTypeOption) {
  if (!option) return undefined

  if (option.previewSvgString?.trim()) {
    return option.previewSvgString.trim()
  }

  const provider = option.previewSvgProvider
  if (provider && typeof provider === 'object') {
    if (previewSvgCache.has(provider)) {
      return previewSvgCache.get(provider)
    }
    const svg = callPreviewSvgString(provider, LINE_TYPE_PREVIEW_SVG_OPTIONS)
    previewSvgCache.set(provider, svg)
    return svg
  }

  return callPreviewSvgString(
    option.lineType as LineTypePreviewSvgProvider | undefined,
    LINE_TYPE_PREVIEW_SVG_OPTIONS
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
    // Do not eagerly call `toPreviewSvgString` for every record. Drawings with
    // hundreds of complex TEXT linetypes (and N layer-table selects) otherwise
    // allocate megabytes of SVG strings up front. Dropdown rows use the CSS
    // dash preview (or resolve SVG on demand when the menu is open); the
    // selected value can still resolve SVG on demand via previewSvgProvider.
    options.push({
      value: name,
      label: name,
      lineType: record.linetype,
      previewSvgProvider: record
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
