import {
  type AcDbGradientName,
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
const HATCH_GRADIENT_PATTERN_PREFIX = 'GR_'
const HATCH_GRADIENT_NAMES: AcDbGradientName[] = [
  'LINEAR',
  'CYLINDER',
  'INVCYLINDER',
  'SPHERICAL',
  'INVSPHERICAL',
  'HEMISPHERICAL',
  'INVHEMISPHERICAL',
  'CURVED',
  'INVCURVED'
]

const normalizedPredefinedPatterns = AcDbPredefinedAcadIsoPat.patterns
  .map(pattern => ({
    ...pattern,
    name: pattern.name.trim().toUpperCase()
  }))
  .filter(pattern => pattern.name.length > 0)

const hatchPatternByName = new Map<string, AcDbPatPattern>(
  normalizedPredefinedPatterns.map(pattern => [pattern.name, pattern])
)
const hatchGradientByPatternName = new Map<string, AcDbGradientName>(
  HATCH_GRADIENT_NAMES.map(name => [
    `${HATCH_GRADIENT_PATTERN_PREFIX}${name}`,
    name
  ])
)

const swatchBackgroundImageCache = new Map<string, string>()
const previewSvgCache = new Map<string, string>()

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
export function toSvgDataUri(svg: string) {
  const encoded = encodeURIComponent(svg)
    .replace(/%0A/g, '')
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/')
  return `data:image/svg+xml,${encoded}`
}

function toCssSvgDataUrl(svg: string) {
  return `url("${toSvgDataUri(svg)}")`
}

function resolveGradientPreviewSvg(gradientName: AcDbGradientName) {
  return hatchPatternSvgRenderer.renderGradient(gradientName, {
    width: 52,
    height: 52,
    angle: Math.PI / 4,
    background: '#f6f8fb'
  })
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
  const gradientName = hatchGradientByPatternName.get(normalized)
  if (!pattern && !gradientName) return undefined

  const svg = gradientName
    ? resolveGradientPreviewSvg(gradientName)
    : hatchPatternSvgRenderer.renderPattern(pattern!, {
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
 * Returns a cached SVG data URI preview for a hatch pattern.
 *
 * @param name Hatch pattern name.
 * @returns Data URI suitable for image-based preview controls.
 */
export function resolveHatchPatternPreviewSvg(name: string) {
  const normalized = name.trim().toUpperCase()
  const cached = previewSvgCache.get(normalized)
  if (cached) return cached

  const pattern = hatchPatternByName.get(normalized)
  const gradientName = hatchGradientByPatternName.get(normalized)
  if (!pattern && !gradientName) return undefined

  const svg = gradientName
    ? resolveGradientPreviewSvg(gradientName)
    : hatchPatternSvgRenderer.renderPattern(pattern!, {
        width: 52,
        height: 52,
        stroke: '#2f3743',
        strokeWidth: 1.2,
        background: '#f6f8fb'
      })
  const dataUri = toSvgDataUri(svg)
  previewSvgCache.set(normalized, dataUri)
  return dataUri
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
  ...new Map([
    ...normalizedPredefinedPatterns.map(
      pattern =>
        [pattern.name, { value: pattern.name, label: pattern.name }] as const
    ),
    ...HATCH_GRADIENT_NAMES.map(name => {
      const patternName = `${HATCH_GRADIENT_PATTERN_PREFIX}${name}`
      return [patternName, { value: patternName, label: patternName }] as const
    })
  ]).values()
]
