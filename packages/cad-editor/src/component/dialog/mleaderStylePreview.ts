import {
  AcCmColor,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcDbMLeaderStyle
} from '@mlightcad/data-model'

/** Width of the preview drawing in SVG user units. */
export const MLEADER_PREVIEW_WIDTH = 280
/** Height of the preview drawing in SVG user units. */
export const MLEADER_PREVIEW_HEIGHT = 200

export interface MLeaderPreviewLine {
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  strokeWidth: number
}

export interface MLeaderPreviewPath {
  d: string
  stroke: string
  strokeWidth: number
  fill: string
}

export interface MLeaderPreviewCircle {
  cx: number
  cy: number
  r: number
  stroke: string
  strokeWidth: number
  fill: string
}

export interface MLeaderPreviewText {
  x: number
  y: number
  text: string
  fontSize: number
  fill: string
  textAnchor: 'start' | 'middle' | 'end'
  box?: { x: number; y: number; w: number; h: number }
  frame?: string
}

export interface MLeaderPreviewScene {
  lines: MLeaderPreviewLine[]
  paths: MLeaderPreviewPath[]
  circles: MLeaderPreviewCircle[]
  texts: MLeaderPreviewText[]
}

type ArrowKind = 'filled' | 'open' | 'tick' | 'dot' | 'box' | 'origin' | 'none'

interface Point {
  x: number
  y: number
}

const LEADER_STROKE = 1.5
const DEFAULT_STYLE = new AcDbMLeaderStyle()
const FALLBACK_LEADER = '#f0a030'
const FALLBACK_TEXT = '#f0a030'

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return value == null || !Number.isFinite(parsed) ? fallback : parsed
}

function resolveColor(color: AcCmColor | undefined, fallback: string): string {
  if (!color) return fallback
  if (color.isByBlock || color.isByLayer) return fallback
  return color.cssColor ?? fallback
}

function classifyArrow(arrowId: string | undefined): ArrowKind {
  const name = String(arrowId ?? '').toUpperCase()
  if (!name || name === '.' || name === 'CLOSEDFILLED') return 'filled'
  if (name.includes('NONE')) return 'none'
  if (name.includes('DOT')) return 'dot'
  if (name.includes('OPEN')) return 'open'
  if (name.includes('ARCHTICK') || name.includes('OBLIQUE')) return 'tick'
  if (name.includes('ORIGIN')) return 'origin'
  if (name.includes('BOX')) return 'box'
  if (name.includes('CLOSEDBLANK') || name === '_CLOSED') return 'open'
  return 'filled'
}

function addLine(
  scene: MLeaderPreviewScene,
  p1: Point,
  p2: Point,
  stroke: string,
  strokeWidth: number = LEADER_STROKE
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
  scene: MLeaderPreviewScene,
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
        strokeWidth: LEADER_STROKE,
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
      const s = size * 0.45
      scene.paths.push({
        d: `M ${tip.x - s} ${tip.y - s} L ${tip.x + s} ${tip.y - s} L ${tip.x + s} ${tip.y + s} L ${tip.x - s} ${tip.y + s} Z`,
        stroke: color,
        strokeWidth: LEADER_STROKE,
        fill: 'none'
      })
      break
    }
    case 'origin':
      scene.circles.push({
        cx: tip.x,
        cy: tip.y,
        r: Math.max(2, size * 0.28),
        stroke: color,
        strokeWidth: LEADER_STROKE,
        fill: 'none'
      })
      scene.circles.push({
        cx: tip.x,
        cy: tip.y,
        r: Math.max(0.8, size * 0.1),
        stroke: 'none',
        strokeWidth: 0,
        fill: color
      })
      break
  }
}

function normalize(dx: number, dy: number): Point {
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}

/**
 * Converts a packed 24-bit RGB canvas background to a CSS hex color.
 */
export function acuiRgbToCss(rgb: number | undefined): string {
  if (rgb == null || !Number.isFinite(rgb)) return '#1a1f24'
  const value = rgb >>> 0
  const r = (value >> 16) & 0xff
  const g = (value >> 8) & 0xff
  const b = value & 0xff
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Builds an AutoCAD-like multileader style preview scene.
 *
 * Sizes are normalized for fit-to-window display (style scale is ignored).
 */
export function buildMLeaderStylePreview(
  style?: AcDbMLeaderStyle
): MLeaderPreviewScene {
  const source = style ?? DEFAULT_STYLE
  const scene: MLeaderPreviewScene = {
    lines: [],
    paths: [],
    circles: [],
    texts: []
  }

  const leaderColor = resolveColor(source.leaderLineColor, FALLBACK_LEADER)
  const textColor = resolveColor(source.textColor, FALLBACK_TEXT)
  const blockColor = resolveColor(source.blockColor, FALLBACK_TEXT)
  const lineType = asNumber(
    source.leaderLineType,
    AcDbMLeaderLineType.StraightLeader
  )
  const contentType = asNumber(
    source.contentType,
    AcDbMLeaderContentType.MTextContent
  )
  const arrowSize = Math.max(6, Math.min(22, asNumber(source.arrowSize, 4) * 3))
  const textHeight = Math.max(
    10,
    Math.min(28, asNumber(source.textHeight, 4) * 4)
  )
  const includeLanding =
    source.enableLanding !== false && source.enableDogleg !== false
  const landingLen = includeLanding
    ? Math.max(18, Math.min(60, asNumber(source.doglegLength, 8) * 4))
    : 0

  const tip: Point = { x: 36, y: 150 }
  const elbow: Point = { x: 120, y: 72 }
  const landingEnd: Point = {
    x: elbow.x + landingLen,
    y: elbow.y
  }
  const contentAnchor: Point = includeLanding
    ? { x: landingEnd.x + 8, y: landingEnd.y }
    : { x: elbow.x + 8, y: elbow.y }

  if (lineType !== AcDbMLeaderLineType.InvisibleLeader) {
    if (lineType === AcDbMLeaderLineType.SplineLeader) {
      const mid: Point = {
        x: (tip.x + elbow.x) / 2 - 12,
        y: (tip.y + elbow.y) / 2 + 18
      }
      scene.paths.push({
        d: `M ${tip.x} ${tip.y} Q ${mid.x} ${mid.y} ${elbow.x} ${elbow.y}`,
        stroke: leaderColor,
        strokeWidth: LEADER_STROKE,
        fill: 'none'
      })
    } else {
      addLine(scene, tip, elbow, leaderColor)
    }

    if (includeLanding && landingLen > 0) {
      addLine(scene, elbow, landingEnd, leaderColor)
    }

    const dir = normalize(elbow.x - tip.x, elbow.y - tip.y)
    addArrow(
      scene,
      tip,
      { x: -dir.x, y: -dir.y },
      arrowSize,
      classifyArrow(source.arrowSymbolId),
      leaderColor
    )
  }

  if (contentType === AcDbMLeaderContentType.NoneContent) {
    return scene
  }

  if (contentType === AcDbMLeaderContentType.BlockContent) {
    const size = Math.max(14, textHeight * 0.9)
    const cx = contentAnchor.x + size * 0.7
    const cy = contentAnchor.y
    scene.paths.push({
      d: `M ${cx - size / 2} ${cy - size / 2} L ${cx + size / 2} ${cy - size / 2} L ${cx + size / 2} ${cy + size / 2} L ${cx - size / 2} ${cy + size / 2} Z`,
      stroke: blockColor,
      strokeWidth: LEADER_STROKE,
      fill: 'none'
    })
    scene.texts.push({
      x: cx,
      y: cy + textHeight * 0.35,
      text: 'B',
      fontSize: textHeight * 0.7,
      fill: blockColor,
      textAnchor: 'middle'
    })
    return scene
  }

  const rawText = String(source.defaultMTextContents ?? '').trim()
  const label = rawText || 'Default Text'
  const approxWidth = Math.max(48, label.length * textHeight * 0.55)
  const boxPadX = 4
  const boxPadY = 3
  const box = {
    x: contentAnchor.x,
    y: contentAnchor.y - textHeight * 0.75,
    w: approxWidth + boxPadX * 2,
    h: textHeight + boxPadY * 2
  }

  scene.texts.push({
    x: contentAnchor.x + boxPadX,
    y: contentAnchor.y + textHeight * 0.25,
    text: label,
    fontSize: textHeight,
    fill: textColor,
    textAnchor: 'start',
    box: source.enableFrameText ? box : undefined,
    frame: source.enableFrameText ? textColor : undefined
  })

  return scene
}
