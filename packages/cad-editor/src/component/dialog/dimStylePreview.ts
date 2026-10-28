import {
  acdbDecodeDimStyleColor,
  AcDbDimStyleTableRecord
} from '@mlightcad/data-model'

/** Width of the preview drawing in SVG user units. */
export const DIM_PREVIEW_WIDTH = 420
/** Height of the preview drawing in SVG user units. */
export const DIM_PREVIEW_HEIGHT = 250

export interface DimPreviewLine {
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  strokeWidth: number
}

export interface DimPreviewPath {
  d: string
  stroke: string
  strokeWidth: number
  fill: string
}

export interface DimPreviewCircle {
  cx: number
  cy: number
  r: number
  stroke: string
  strokeWidth: number
  fill: string
}

export interface DimPreviewText {
  x: number
  y: number
  text: string
  fontSize: number
  fill: string
  textAnchor: 'start' | 'middle' | 'end'
  rotation: number
  /** Optional geometry of background fill / text frame rectangle. */
  box?: { x: number; y: number; w: number; h: number }
  /** Fill color behind the text (DIMTFILL). */
  background?: string
  /** Frame stroke color (drawn when DIMGAP is negative). */
  frame?: string
  /** Mirror text horizontally (DIMTXTDIRECTION = 1). */
  mirror?: boolean
}

export interface DimPreviewScene {
  lines: DimPreviewLine[]
  paths: DimPreviewPath[]
  circles: DimPreviewCircle[]
  texts: DimPreviewText[]
}

interface Point {
  x: number
  y: number
}

interface PreviewColors {
  geometry: string
  dimension: string
  extension: string
  text: string
}

interface PreviewMetrics {
  text: number
  arrow: number
  gap: number
  exo: number
  exe: number
  dle: number
}

type ArrowKind = 'filled' | 'open' | 'tick' | 'dot' | 'box' | 'origin' | 'none'

/**
 * Pixel size used for one drawing unit of a DIMSTYLE value.
 *
 * DIMSCALE is deliberately not applied: like AutoCAD's fit-to-window preview,
 * the whole illustration is normalized so that annotation sizes remain
 * comparable between styles.
 */
const PX_PER_UNIT = 6
const GEOMETRY_STROKE = 1.4
const DIMENSION_STROKE = 1.15
const DEFAULT_STYLE = new AcDbDimStyleTableRecord()

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return value == null || !Number.isFinite(parsed) ? fallback : parsed
}

function asFlag(value: unknown): boolean {
  return asNumber(value, 0) !== 0
}

function resolveColor(raw: unknown, fallback: string): string {
  const color = acdbDecodeDimStyleColor(raw)
  if (color.isForeground) return 'var(--el-text-color-primary)'
  if (color.isByBlock || color.isByLayer) return fallback
  return color.cssColor ?? fallback
}

function classifyArrow(style: AcDbDimStyleTableRecord): ArrowKind {
  if (asNumber(style.dimtsz, 0) > 0) return 'tick'
  const name = String(style.dimblk ?? '').toUpperCase()
  if (!name || name === '.' || name === 'CLOSEDFILLED') return 'filled'
  if (name.includes('DOT')) return 'dot'
  if (name.includes('OPEN')) return 'open'
  if (name.includes('ARCHTICK') || name.includes('OBLIQUE')) return 'tick'
  if (name.includes('NONE')) return 'none'
  if (name.includes('ORIGIN')) return 'origin'
  if (name.includes('BOX')) return 'box'
  if (name.includes('CLOSEDBLANK')) return 'open'
  return 'filled'
}

function addLine(
  scene: DimPreviewScene,
  p1: Point,
  p2: Point,
  stroke: string,
  strokeWidth: number = DIMENSION_STROKE
) {
  scene.lines.push({
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    stroke,
    strokeWidth
  })
}

function addArrow(
  scene: DimPreviewScene,
  tip: Point,
  direction: Point,
  size: number,
  kind: ArrowKind,
  color: string
) {
  if (kind === 'none' || size <= 0) return

  const ux = direction.x
  const uy = direction.y
  const baseX = tip.x - ux * size
  const baseY = tip.y - uy * size
  const px = -uy
  const py = ux
  const half = size * 0.34

  switch (kind) {
    case 'filled':
      scene.paths.push({
        d: `M ${tip.x} ${tip.y} L ${baseX + px * half} ${baseY + py * half} L ${baseX - px * half} ${baseY - py * half} Z`,
        stroke: 'none',
        strokeWidth: 0,
        fill: color
      })
      break
    case 'open':
      scene.paths.push({
        d: `M ${baseX + px * half} ${baseY + py * half} L ${tip.x} ${tip.y} L ${baseX - px * half} ${baseY - py * half}`,
        stroke: color,
        strokeWidth: DIMENSION_STROKE,
        fill: 'none'
      })
      break
    case 'tick': {
      const h = size * 0.55
      const dx = (ux + px) / Math.SQRT2
      const dy = (uy + py) / Math.SQRT2
      addLine(
        scene,
        { x: tip.x - dx * h, y: tip.y - dy * h },
        { x: tip.x + dx * h, y: tip.y + dy * h },
        color
      )
      break
    }
    case 'dot':
      scene.circles.push({
        cx: tip.x,
        cy: tip.y,
        r: Math.max(1.4, size * 0.2),
        stroke: 'none',
        strokeWidth: 0,
        fill: color
      })
      break
    case 'box': {
      const h = size * 0.5
      const p1 = { x: baseX + px * h, y: baseY + py * h }
      const p2 = { x: tip.x + px * h, y: tip.y + py * h }
      const p3 = { x: tip.x - px * h, y: tip.y - py * h }
      const p4 = { x: baseX - px * h, y: baseY - py * h }
      scene.paths.push({
        d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`,
        stroke: color,
        strokeWidth: 1,
        fill: 'none'
      })
      break
    }
    case 'origin': {
      const h = size * 0.5
      addLine(
        scene,
        { x: tip.x - h, y: tip.y },
        { x: tip.x + h, y: tip.y },
        color
      )
      addLine(
        scene,
        { x: tip.x, y: tip.y - h },
        { x: tip.x, y: tip.y + h },
        color
      )
      break
    }
  }
}

function estimateTextWidth(text: string, fontSize: number): number {
  let factor = 0
  for (const char of text) {
    factor += /[\u3000-\u9fff\uff00-\uffef]/.test(char) ? 1 : 0.58
  }
  return factor * fontSize
}

/** Convert MTEXT-style codes produced by the data model into plain SVG text. */
function sanitizeDimensionText(raw: string): string {
  const decode = (value: string) =>
    value.replace(/%%d/gi, '°').replace(/%%c/gi, '⌀').replace(/%%p/gi, '±')
  const replaceTolerance = (text: string) =>
    text
      .replace(
        /\{\\H[0-9.]+x;\\S\+([^^;]*)\^-([^;]*);\}/g,
        (_match: string, plus: string, minus: string) =>
          plus === minus ? `±${plus}` : ` ${plus}/${minus}`
      )
      .replace(
        /\\S\+([^^;]*)\^-([^;]*);/g,
        (_match: string, plus: string, minus: string) =>
          plus === minus ? `±${plus}` : ` ${plus}/${minus}`
      )

  return replaceTolerance(decode(raw)).replace(/[{}]/g, '').trim()
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const temp = y
    y = x % y
    x = temp
  }
  return x || 1
}

function formatDecimal(
  value: number,
  decimals: number,
  separator: string
): string {
  const fixed = value.toFixed(Math.max(0, decimals))
  return separator && separator !== '.' ? fixed.replace('.', separator) : fixed
}

function formatFractional(value: number, precision: number): string {
  const whole = Math.trunc(value)
  const fraction = Math.abs(value - whole)
  const denominator = Math.max(1, 2 ** Math.min(6, Math.max(0, precision)))
  let numerator = Math.round(fraction * denominator)
  if (numerator === 0) return String(whole)
  if (numerator === denominator) {
    return String(whole + (value < 0 ? -1 : 1))
  }
  const divisor = gcd(numerator, denominator)
  numerator /= divisor
  const reducedDenominator = denominator / divisor
  if (whole === 0) {
    return `${value < 0 ? '-' : ''}${numerator}/${reducedDenominator}`
  }
  return `${whole} ${numerator}/${reducedDenominator}`
}

function formatArchitectural(value: number, precision: number): string {
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  const feet = Math.trunc(absolute / 12)
  const inches = absolute - feet * 12
  const inchText = formatFractional(inches, precision)
  if (feet > 0) {
    return `${sign}${feet}'-${inchText}"`
  }
  return `${sign}${inchText}"`
}

function formatEngineering(value: number, decimals: number): string {
  const feet = Math.trunc(value / 12)
  const inches = value - feet * 12
  return `${feet}'-${inches.toFixed(Math.max(0, decimals))}"`
}

function applyZeroSuppression(body: string, zin: number): string {
  let text = body
  if ((zin & 4) !== 0 && text.startsWith('0.')) {
    text = text.slice(1)
  }
  if ((zin & 8) !== 0 && text.includes('.')) {
    text = text.replace(/\.?0+$/, '')
  }
  return text
}

function applyAngularZeroSuppression(body: string, azin: number): string {
  let text = body
  if ((azin === 1 || azin === 3) && text.startsWith('0.')) {
    text = text.slice(1)
  }
  if (azin === 2 || azin === 3) {
    text = text
      .replace(/(\.\d*?)0+(%%d|g|r|"|')?$/, '$1$2')
      .replace(/\.(%%d|g|r)/, '$1')
  }
  return text
}

function applyDimPost(body: string, dimpost: string): string {
  if (!dimpost) return body
  if (dimpost.includes('<>')) {
    return dimpost.split('<>').join(body)
  }
  return `${body}${dimpost}`
}

/**
 * Format the alternate-unit value shown in brackets after the primary
 * measurement, honoring DIMALTF / DIMALTRND / DIMALTD / DIMALTU / DIMALTZ /
 * DIMAPOST the same way the primary measurement honors DIMLFAC / DIMRND /
 * DIMDEC / DIMLUNIT / DIMZIN / DIMPOST.
 */
function formatAlternateMeasurement(
  raw: number,
  style: AcDbDimStyleTableRecord
): string {
  let value =
    raw * asNumber(style.dimlfac, 1) * (asNumber(style.dimaltf, 0) || 25.4)
  const rounding = asNumber(style.dimaltrnd, 0)
  if (rounding > 0) {
    value = Math.round(value / rounding) * rounding
  }

  const decimals = Math.max(0, asNumber(style.dimaltd, 2))
  const separator = String(style.dimdsep || '.')
  let body: string
  switch (asNumber(style.dimaltu, 2)) {
    case 1:
      body = value.toExponential(decimals)
      break
    case 3:
      body = formatEngineering(value, decimals)
      break
    case 4:
    case 6:
      body = formatArchitectural(value, decimals)
      break
    case 5:
    case 7:
      body = formatFractional(value, decimals)
      break
    default:
      body = formatDecimal(value, decimals, separator)
      break
  }

  body = applyZeroSuppression(body, asNumber(style.dimaltz, 0))
  return applyDimPost(body, String(style.dimapost ?? ''))
}

/** Format a linear measurement using the same rules as the dimension renderer. */
function formatLinearMeasurement(
  raw: number,
  style: AcDbDimStyleTableRecord
): string {
  let value = raw * asNumber(style.dimlfac, 1)
  const rounding = asNumber(style.dimrnd, 0)
  if (rounding > 0) {
    value = Math.round(value / rounding) * rounding
  }

  const decimals = Math.max(0, asNumber(style.dimdec, 2))
  const separator = String(style.dimdsep || '.')
  let body: string
  switch (asNumber(style.dimlunit, 2)) {
    case 1:
      body = value.toExponential(decimals)
      break
    case 3:
      body = formatEngineering(value, decimals)
      break
    case 4:
      body = formatArchitectural(value, decimals)
      break
    case 5:
      body = formatFractional(value, decimals)
      break
    default:
      body = formatDecimal(value, decimals, separator)
      break
  }

  body = applyZeroSuppression(body, asNumber(style.dimzin, 0))
  return applyDimPost(body, String(style.dimpost ?? ''))
}

/** Format an angular measurement using the dimension style angle settings. */
function formatAngularMeasurement(
  radians: number,
  style: AcDbDimStyleTableRecord
): string {
  const absolute = Math.abs(radians)
  const decimals = Math.max(0, asNumber(style.dimadec, 0))
  const separator = String(style.dimdsep || '.')
  let body: string

  switch (asNumber(style.dimaunit, 0)) {
    case 1: {
      const total = (absolute * 180) / Math.PI
      const degrees = Math.floor(total)
      const minutesFloat = (total - degrees) * 60
      const minutes = Math.floor(minutesFloat)
      const seconds = (minutesFloat - minutes) * 60
      const secondsText =
        decimals > 0 ? seconds.toFixed(decimals) : String(Math.round(seconds))
      body = `${degrees}d${String(minutes).padStart(2, '0')}'${secondsText}"`
      break
    }
    case 2:
      body = `${formatDecimal((absolute * 200) / Math.PI, decimals, separator)}g`
      break
    case 3:
      body = `${formatDecimal(absolute, decimals, separator)}r`
      break
    default:
      body = `${formatDecimal((absolute * 180) / Math.PI, decimals, separator)}%%d`
      break
  }

  body = applyAngularZeroSuppression(body, asNumber(style.dimazin, 0))
  return applyDimPost(body, String(style.dimpost ?? ''))
}

function resolveAnnotation(
  raw: number,
  style: AcDbDimStyleTableRecord,
  kind: 'linear' | 'radial' | 'angular'
): string {
  let text =
    kind === 'angular'
      ? formatAngularMeasurement(raw, style)
      : formatLinearMeasurement(raw, style)

  if (kind === 'radial' && !text.startsWith('R')) {
    text = `R${text}`
  }

  if (kind !== 'angular' && asNumber(style.dimtol, 0) === 1) {
    const precision = Math.max(0, asNumber(style.dimtdec, 0))
    const plus = asNumber(style.dimtp, 0).toFixed(precision)
    const minus = asNumber(style.dimtm, 0).toFixed(precision)
    text = `${text}{\\H0.7x;\\S+${plus}^-${minus};}`
  }

  if (kind !== 'angular' && asNumber(style.dimalt, 0) === 1) {
    const alternate = formatAlternateMeasurement(raw, style)
    text = `${text} [${alternate}]`
  }

  return text
}

function measuredText(
  style: AcDbDimStyleTableRecord,
  raw: number,
  kind: 'linear' | 'radial' | 'angular'
): string {
  return sanitizeDimensionText(resolveAnnotation(raw, style, kind))
}

/**
 * Push a dimension text entry and attach the background fill / frame
 * rectangle (DIMTFILL, negative DIMGAP) and the viewing direction
 * (DIMTXTDIRECTION). `gap` is the drawing-unit text gap already in pixels.
 */
function pushDimensionText(
  scene: DimPreviewScene,
  style: AcDbDimStyleTableRecord,
  colors: PreviewColors,
  entry: {
    x: number
    y: number
    text: string
    fontSize: number
    textAnchor: DimPreviewText['textAnchor']
    rotation: number
    gap: number
  }
) {
  const text: DimPreviewText = {
    x: entry.x,
    y: entry.y,
    text: entry.text,
    fontSize: entry.fontSize,
    fill: colors.text,
    textAnchor: entry.textAnchor,
    rotation: entry.rotation
  }

  const showBackground = asNumber(style.dimtfill, 0) !== 0
  const frame = asNumber(style.dimgap, 1) < 0
  if (showBackground || frame) {
    const width = estimateTextWidth(entry.text, entry.fontSize)
    const pad = clamp(entry.gap, 1.5, 8)
    const startX =
      entry.textAnchor === 'middle'
        ? entry.x - width / 2
        : entry.textAnchor === 'end'
          ? entry.x - width
          : entry.x
    text.box = {
      x: startX - pad,
      y: entry.y - entry.fontSize * 0.8 - pad,
      w: width + 2 * pad,
      h: entry.fontSize + 2 * pad
    }
    if (showBackground) {
      if (asNumber(style.dimtfill, 0) === 1) {
        // Drawing background color — the canvas of the preview panel.
        text.background = 'var(--el-bg-color)'
      } else {
        const color = acdbDecodeDimStyleColor(style.dimtfillclr)
        text.background =
          color.cssColor ??
          (color.isForeground
            ? 'var(--el-text-color-primary)'
            : 'var(--el-bg-color)')
      }
    }
    if (frame) {
      text.frame = colors.text
    }
  }
  if (asNumber(style.dimtxtdirection, 0) === 1) {
    text.mirror = true
  }
  scene.texts.push(text)
}

/**
 * Draw one linear/aligned dimension.
 *
 * `p1` and `p2` are the measured points, and the dimension line is offset
 * along the left-hand normal of `p1 -> p2` by `offset` pixels.
 */
function addLinearDimension(
  scene: DimPreviewScene,
  style: AcDbDimStyleTableRecord,
  metrics: PreviewMetrics,
  colors: PreviewColors,
  arrow: ArrowKind,
  p1: Point,
  p2: Point,
  offset: number,
  raw: number
) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const length = Math.hypot(dx, dy)
  if (length <= 0.001) return

  const ux = dx / length
  const uy = dy / length
  const nx = uy
  const ny = -ux
  const at = (t: number, n: number): Point => ({
    x: p1.x + ux * t + nx * n,
    y: p1.y + uy * t + ny * n
  })

  if (!asFlag(style.dimse1)) {
    addLine(
      scene,
      at(0, metrics.exo),
      at(0, offset + metrics.exe),
      colors.extension,
      1
    )
  }
  if (!asFlag(style.dimse2)) {
    addLine(
      scene,
      at(length, metrics.exo),
      at(length, offset + metrics.exe),
      colors.extension,
      1
    )
  }

  const text = measuredText(style, raw, 'linear')
  const fontSize = metrics.text
  const textWidth = estimateTextWidth(text, fontSize)
  const gap = metrics.gap
  const startT = -metrics.dle
  const endT = length + metrics.dle

  let textT = length / 2
  let anchor: DimPreviewText['textAnchor'] = 'middle'
  const justification = asNumber(style.dimjust, 0)
  if (justification === 1) {
    textT = gap
    anchor = 'start'
  } else if (justification === 2) {
    textT = length - gap
    anchor = 'end'
  } else if (justification === 3) {
    textT = 0
    anchor = 'start'
  } else if (justification === 4) {
    textT = length
    anchor = 'end'
  }

  const gapStart =
    anchor === 'start'
      ? textT
      : anchor === 'end'
        ? textT - textWidth
        : textT - textWidth / 2
  const gapEnd =
    anchor === 'start'
      ? textT + textWidth
      : anchor === 'end'
        ? textT
        : textT + textWidth / 2

  const suppressFirst = asFlag(style.dimsd1)
  const suppressSecond = asFlag(style.dimsd2)
  const textVertical = asNumber(style.dimtad, 0)

  if (textVertical === 0) {
    if (!suppressFirst) {
      const segmentEnd = Math.min(gapStart, endT)
      if (segmentEnd > startT) {
        addLine(
          scene,
          at(startT, offset),
          at(segmentEnd, offset),
          colors.dimension
        )
      }
    }
    if (!suppressSecond) {
      const segmentStart = Math.max(gapEnd, startT)
      if (segmentStart < endT) {
        addLine(
          scene,
          at(segmentStart, offset),
          at(endT, offset),
          colors.dimension
        )
      }
    }
  } else if (!suppressFirst && !suppressSecond) {
    addLine(scene, at(startT, offset), at(endT, offset), colors.dimension)
  } else if (!suppressFirst) {
    const segmentEnd = Math.min(textT, endT)
    if (segmentEnd > startT) {
      addLine(
        scene,
        at(startT, offset),
        at(segmentEnd, offset),
        colors.dimension
      )
    }
  } else if (!suppressSecond) {
    const segmentStart = Math.max(textT, startT)
    if (segmentStart < endT) {
      addLine(
        scene,
        at(segmentStart, offset),
        at(endT, offset),
        colors.dimension
      )
    }
  }

  if (!suppressFirst) {
    addArrow(
      scene,
      at(0, offset),
      { x: -ux, y: -uy },
      metrics.arrow,
      arrow,
      colors.dimension
    )
  }
  if (!suppressSecond) {
    addArrow(
      scene,
      at(length, offset),
      { x: ux, y: uy },
      metrics.arrow,
      arrow,
      colors.dimension
    )
  }

  let baseline: number
  if (textVertical === 0) {
    baseline = offset + fontSize * 0.35
  } else if (textVertical === 4) {
    baseline = offset - gap - fontSize * 0.8
  } else {
    baseline = offset + gap + fontSize * 0.8
  }

  let rotation = 0
  // Preview dimensions sit outside the extension lines, so text alignment
  // follows DIMTOH (see the "Text alignment" option of the Text tab).
  if (!asFlag(style.dimtoh)) {
    rotation = (Math.atan2(uy, ux) * 180) / Math.PI
    if (rotation > 90) rotation -= 180
    else if (rotation < -90) rotation += 180
  }

  const position = at(textT, baseline)
  pushDimensionText(scene, style, colors, {
    x: position.x,
    y: position.y,
    text,
    fontSize,
    textAnchor: anchor,
    rotation,
    gap
  })
}

/** Draw the fillet radius dimension at the lower-left corner. */
function addRadialDimension(
  scene: DimPreviewScene,
  style: AcDbDimStyleTableRecord,
  metrics: PreviewMetrics,
  colors: PreviewColors,
  arrow: ArrowKind,
  center: Point,
  radius: number,
  raw: number
) {
  const angle = (3 * Math.PI) / 4
  const rx = Math.cos(angle)
  const ry = Math.sin(angle)
  const arcPoint = {
    x: center.x + rx * radius,
    y: center.y + ry * radius
  }
  const elbow = {
    x: arcPoint.x + rx * 24,
    y: arcPoint.y + ry * 24
  }
  const landing = { x: elbow.x - 36, y: elbow.y }

  addLine(scene, arcPoint, elbow, colors.dimension, 1)
  addLine(scene, elbow, landing, colors.dimension, 1)
  addArrow(
    scene,
    arcPoint,
    { x: rx, y: ry },
    metrics.arrow,
    arrow,
    colors.dimension
  )

  const text = measuredText(style, raw, 'radial')
  let rotation = 0
  if (!asFlag(style.dimtoh)) {
    rotation = (angle * 180) / Math.PI
    if (rotation > 90) rotation -= 180
    else if (rotation < -90) rotation += 180
  }
  pushDimensionText(scene, style, colors, {
    x: elbow.x - 4,
    y: elbow.y - metrics.gap,
    text,
    fontSize: metrics.text,
    textAnchor: 'end',
    rotation,
    gap: metrics.gap
  })
}

/** Draw the angular dimension at the lower-right vertex. */
function addAngularDimension(
  scene: DimPreviewScene,
  style: AcDbDimStyleTableRecord,
  metrics: PreviewMetrics,
  colors: PreviewColors,
  arrow: ArrowKind,
  vertex: Point,
  startDegrees: number,
  endDegrees: number,
  rawRadians: number
) {
  const radius = 66
  const start = (startDegrees * Math.PI) / 180
  const end = (endDegrees * Math.PI) / 180
  const startPoint = {
    x: vertex.x + Math.cos(start) * radius,
    y: vertex.y + Math.sin(start) * radius
  }
  const endPoint = {
    x: vertex.x + Math.cos(end) * radius,
    y: vertex.y + Math.sin(end) * radius
  }

  scene.paths.push({
    d: `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}`,
    stroke: colors.dimension,
    strokeWidth: DIMENSION_STROKE,
    fill: 'none'
  })

  addArrow(
    scene,
    startPoint,
    { x: Math.sin(start), y: -Math.cos(start) },
    metrics.arrow,
    arrow,
    colors.dimension
  )
  addArrow(
    scene,
    endPoint,
    { x: -Math.sin(end), y: Math.cos(end) },
    metrics.arrow,
    arrow,
    colors.dimension
  )

  const middle = (start + end) / 2
  const textRadius = radius + metrics.gap + metrics.text / 2 + 2
  const text = measuredText(style, rawRadians, 'angular')
  let rotation = 0
  if (!asFlag(style.dimtoh)) {
    rotation = (middle * 180) / Math.PI
    if (rotation > 90) rotation -= 180
    else if (rotation < -90) rotation += 180
  }
  pushDimensionText(scene, style, colors, {
    x: vertex.x + Math.cos(middle) * textRadius,
    y: vertex.y + Math.sin(middle) * textRadius + metrics.text * 0.35,
    text,
    fontSize: metrics.text,
    textAnchor: 'middle',
    rotation,
    gap: metrics.gap
  })
}

/**
 * Build a scene that mirrors the illustration shown in AutoCAD's Dimension
 * Style Manager: a beveled plate with a rounded corner, a center mark, an
 * aligned dimension, linear dimensions, a radius and an angular dimension.
 */
export function buildDimStylePreview(
  style?: AcDbDimStyleTableRecord
): DimPreviewScene {
  const source = style ?? DEFAULT_STYLE
  const scene: DimPreviewScene = {
    lines: [],
    paths: [],
    circles: [],
    texts: []
  }

  const colors: PreviewColors = {
    geometry: 'var(--el-text-color-primary)',
    dimension: resolveColor(source.dimclrd, 'var(--el-color-primary)'),
    extension: resolveColor(source.dimclre, 'var(--el-text-color-secondary)'),
    text: resolveColor(source.dimclrt, 'var(--el-text-color-primary)')
  }

  const tickSize = asNumber(source.dimtsz, 0)
  const metrics: PreviewMetrics = {
    text: clamp(asNumber(source.dimtxt, 2.5) * PX_PER_UNIT, 7, 20),
    arrow:
      tickSize > 0
        ? clamp(tickSize * PX_PER_UNIT * 2, 3, 20)
        : clamp(asNumber(source.dimasz, 2.5) * PX_PER_UNIT, 3, 20),
    // DIMGAP magnitude drives spacing; a negative value only means "draw frame".
    gap: clamp(Math.abs(asNumber(source.dimgap, 1)) * PX_PER_UNIT, 1.5, 12),
    exo: clamp(asNumber(source.dimexo, 0.625) * PX_PER_UNIT, 0, 12),
    exe: clamp(asNumber(source.dimexe, 0.18) * PX_PER_UNIT, 0, 12),
    dle: clamp(asNumber(source.dimdle, 0) * PX_PER_UNIT, 0, 16)
  }

  const arrow = classifyArrow(source)
  const corner = { x: 96, y: 72 }
  const armEnd = { x: 210, y: 72 }
  const bevelEnd = { x: 313, y: 104 }
  const rightBottom = { x: 332, y: 212 }
  const bottomStart = { x: 144, y: 212 }
  const filletStart = { x: 96, y: 164 }
  const filletRadius = 48
  const filletCenter = { x: 144, y: 164 }
  const holeCenter = { x: 185, y: 146 }
  const holeRadius = 42

  scene.paths.push({
    d:
      `M ${corner.x} ${corner.y} L ${armEnd.x} ${armEnd.y} ` +
      `L ${bevelEnd.x} ${bevelEnd.y} L ${rightBottom.x} ${rightBottom.y} ` +
      `L ${bottomStart.x} ${bottomStart.y} ` +
      `A ${filletRadius} ${filletRadius} 0 0 1 ${filletStart.x} ${filletStart.y} Z`,
    stroke: colors.geometry,
    strokeWidth: GEOMETRY_STROKE,
    fill: 'none'
  })

  scene.circles.push({
    cx: holeCenter.x,
    cy: holeCenter.y,
    r: holeRadius,
    stroke: colors.geometry,
    strokeWidth: GEOMETRY_STROKE,
    fill: 'none'
  })

  const centerMark = asNumber(source.dimcen, 2.5)
  if (Math.abs(centerMark) > 0.0001) {
    const half =
      centerMark < 0
        ? holeRadius + Math.abs(centerMark) * PX_PER_UNIT * 0.6
        : Math.max(
            6,
            Math.min(holeRadius - 4, Math.abs(centerMark) * PX_PER_UNIT * 0.9)
          )
    addLine(
      scene,
      { x: holeCenter.x - half, y: holeCenter.y },
      { x: holeCenter.x + half, y: holeCenter.y },
      colors.extension,
      1
    )
    addLine(
      scene,
      { x: holeCenter.x, y: holeCenter.y - half },
      { x: holeCenter.x, y: holeCenter.y + half },
      colors.extension,
      1
    )
  }

  addLinearDimension(
    scene,
    source,
    metrics,
    colors,
    arrow,
    corner,
    armEnd,
    28,
    1
  )
  addLinearDimension(
    scene,
    source,
    metrics,
    colors,
    arrow,
    filletStart,
    corner,
    28,
    1.75
  )
  addLinearDimension(
    scene,
    source,
    metrics,
    colors,
    arrow,
    bevelEnd,
    rightBottom,
    28,
    2
  )
  addRadialDimension(
    scene,
    source,
    metrics,
    colors,
    arrow,
    filletCenter,
    filletRadius,
    0.5
  )
  addAngularDimension(
    scene,
    source,
    metrics,
    colors,
    arrow,
    rightBottom,
    180,
    260,
    (80 * Math.PI) / 180
  )

  return scene
}
