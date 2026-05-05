import {
  type AcDbPatPattern,
  AcDbPatSvgRenderer,
  AcDbPredefinedAcadIsoPat
} from '@mlightcad/data-model'
import type { CSSProperties } from 'vue'

/**
 * Hatch pattern option rendered by hatch preview controls.
 */
export interface HatchPatternOption {
  /** Stable hatch pattern name written to the hatch command inputs. */
  value: string
  /** Optional UI label. Falls back to `value` when omitted. */
  label?: string
}

const hatchPatternSvgRenderer = new AcDbPatSvgRenderer()

const normalizedPredefinedPatterns = AcDbPredefinedAcadIsoPat.patterns
  .map(pattern => ({
    ...pattern,
    name: pattern.name.trim().toUpperCase()
  }))
  .filter(pattern => pattern.name.length > 0)

const hatchPatternByName = new Map<string, AcDbPatPattern>(
  normalizedPredefinedPatterns.map(pattern => [pattern.name, pattern])
)

const swatchBackgroundImageCache = new Map<string, string>()

const SWATCH_BASE_STYLE: CSSProperties = {
  backgroundColor: '#f6f8fb',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: 'cover'
}

/**
 * Encodes an SVG snippet as a data URI that can be used in CSS background-image.
 *
 * @param svg Raw SVG markup.
 * @returns CSS `url(...)` wrapper containing encoded SVG data URI.
 */
function toCssSvgDataUrl(svg: string) {
  const encoded = encodeURIComponent(svg)
    .replace(/%0A/g, '')
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/')
  return `url("data:image/svg+xml,${encoded}")`
}

/**
 * Builds a cached swatch background image for a hatch pattern.
 *
 * @param name Hatch pattern name.
 * @returns CSS-ready `background-image` value when rendering succeeds.
 */
function resolveHatchPatternBackgroundImage(name: string) {
  const normalized = name.trim().toUpperCase()
  const cached = swatchBackgroundImageCache.get(normalized)
  if (cached) return cached

  const pattern = hatchPatternByName.get(normalized)
  if (!pattern) return undefined

  const svg = hatchPatternSvgRenderer.renderPattern(pattern, {
    width: 52,
    height: 52,
    stroke: '#2f3743',
    strokeWidth: 1.2,
    background: '#f6f8fb'
  })
  const backgroundImage = toCssSvgDataUrl(svg)
  swatchBackgroundImageCache.set(normalized, backgroundImage)
  return backgroundImage
}

/**
 * Returns a CSS background preview style for a hatch pattern name.
 *
 * @param name Hatch pattern name selected by the user.
 * @returns Inline style object consumed by swatch elements.
 */
export function resolveHatchPatternSwatchStyle(name: string): CSSProperties {
  const backgroundImage = resolveHatchPatternBackgroundImage(name)

  if (backgroundImage) {
    return {
      ...SWATCH_BASE_STYLE,
      backgroundImage
    }
  }

  return {
    ...SWATCH_BASE_STYLE,
    backgroundImage:
      'repeating-linear-gradient(135deg, #2f3743 0 2px, transparent 2px 12px)'
  }
}

/**
 * Canonical hatch pattern list used by the contextual ribbon picker.
 */
export const DEFAULT_HATCH_PATTERN_OPTIONS: HatchPatternOption[] = [
  ...new Map(
    normalizedPredefinedPatterns.map(pattern => [
      pattern.name,
      { value: pattern.name, label: pattern.name }
    ])
  ).values()
]
