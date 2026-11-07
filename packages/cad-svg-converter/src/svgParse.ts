import { AcGeMatrix2d } from '@mlightcad/data-model'
import {
  type ElementNode,
  type Node as SvgHastNode,
  parse as parseSvg
} from 'svg-parser'

import {
  acdbSvgMatrixIsUniformScale,
  acdbSvgMatrixRotation,
  acdbSvgMatrixUniformScale,
  acdbSvgParseTransform,
  acdbSvgTransformPoint,
  acdbSvgYFlipMatrix
} from './svgMatrix'
import { acdbSvgTessellatePath } from './svgPath'
import type {
  AcDbSvgModel,
  AcDbSvgPoint,
  AcDbSvgPrimitive,
  AcDbSvgStyle,
  AcDbSvgViewBox
} from './svgTypes'

const SUPPORTED = new Set([
  'svg',
  'g',
  'line',
  'polyline',
  'polygon',
  'rect',
  'circle',
  'ellipse',
  'path',
  'text',
  'tspan'
])

/**
 * Parses an SVG document string into CAD-oriented primitives (Y-up).
 *
 * Document parsing uses the open-source [`svg-parser`](https://www.npmjs.com/package/svg-parser)
 * HAST tree. Unsupported elements are skipped.
 */
export function acdbSvgParseDocument(svgText: string): AcDbSvgModel {
  const tree = parseSvg(svgText)
  const root = findSvgElement(tree.children)
  if (!root) {
    throw new Error('SVG root element not found')
  }

  const viewBox = resolveViewBox(root)
  const yFlip = acdbSvgYFlipMatrix(viewBox)
  const primitives: AcDbSvgPrimitive[] = []
  let skippedElementCount = 0

  const walk = (el: ElementNode, parentCtm: AcGeMatrix2d) => {
    const name = (el.tagName ?? '').toLowerCase()
    if (!SUPPORTED.has(name)) {
      skippedElementCount++
      return
    }

    const local = acdbSvgParseTransform(propString(el, 'transform') ?? null)
    const ctm = parentCtm.clone().multiply(local)
    const style = readStyle(el)

    if (name === 'svg' || name === 'g') {
      for (const child of elementChildren(el)) {
        walk(child, ctm)
      }
      return
    }

    if (name === 'line') {
      primitives.push({
        kind: 'line',
        start: toCad(ctm, yFlip, propNum(el, 'x1'), propNum(el, 'y1')),
        end: toCad(ctm, yFlip, propNum(el, 'x2'), propNum(el, 'y2')),
        style
      })
      return
    }

    if (name === 'polyline' || name === 'polygon') {
      const pts = parsePoints(propString(el, 'points') ?? '')
      if (pts.length >= 2) {
        primitives.push({
          kind: 'polyline',
          points: pts.map(p => toCad(ctm, yFlip, p.x, p.y)),
          closed: name === 'polygon',
          style
        })
      }
      return
    }

    if (name === 'rect') {
      const x = propNum(el, 'x')
      const y = propNum(el, 'y')
      const w = propNum(el, 'width')
      const h = propNum(el, 'height')
      if (w > 0 && h > 0) {
        const corners: AcDbSvgPoint[] = [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h }
        ]
        primitives.push({
          kind: 'polyline',
          points: corners.map(p => toCad(ctm, yFlip, p.x, p.y)),
          closed: true,
          style
        })
      }
      return
    }

    if (name === 'circle') {
      const r = propNum(el, 'r')
      if (r > 0) {
        emitCircleOrPoly(
          primitives,
          ctm,
          yFlip,
          propNum(el, 'cx'),
          propNum(el, 'cy'),
          r,
          r,
          style
        )
      }
      return
    }

    if (name === 'ellipse') {
      const rx = propNum(el, 'rx')
      const ry = propNum(el, 'ry')
      if (rx > 0 && ry > 0) {
        emitCircleOrPoly(
          primitives,
          ctm,
          yFlip,
          propNum(el, 'cx'),
          propNum(el, 'cy'),
          rx,
          ry,
          style
        )
      }
      return
    }

    if (name === 'path') {
      const d = propString(el, 'd') ?? ''
      for (const sub of acdbSvgTessellatePath(d)) {
        if (sub.points.length < 2) continue
        primitives.push({
          kind: 'polyline',
          points: sub.points.map(p => toCad(ctm, yFlip, p.x, p.y)),
          closed: sub.closed,
          style
        })
      }
      return
    }

    if (name === 'text') {
      emitText(el, ctm, yFlip, style, primitives)
      return
    }

    if (name === 'tspan') {
      // Handled via parent text.
      return
    }
  }

  walk(root, new AcGeMatrix2d())
  return { viewBox, primitives, skippedElementCount }
}

function findSvgElement(
  children: readonly SvgHastNode[] | undefined
): ElementNode | undefined {
  if (!children) return undefined
  for (const child of children) {
    if (
      typeof child !== 'string' &&
      child.type === 'element' &&
      (child.tagName ?? '').toLowerCase() === 'svg'
    ) {
      return child
    }
  }
  return undefined
}

function elementChildren(el: ElementNode): ElementNode[] {
  const out: ElementNode[] = []
  for (const child of el.children) {
    if (typeof child !== 'string' && child.type === 'element') {
      out.push(child)
    }
  }
  return out
}

function emitCircleOrPoly(
  primitives: AcDbSvgPrimitive[],
  ctm: AcGeMatrix2d,
  yFlip: AcGeMatrix2d,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  style: AcDbSvgStyle
) {
  const center = toCad(ctm, yFlip, cx, cy)
  if (acdbSvgMatrixIsUniformScale(ctm)) {
    const scale = acdbSvgMatrixUniformScale(ctm)
    const full = ctm.clone().premultiply(yFlip)
    if (Math.abs(rx - ry) < 1e-9) {
      primitives.push({
        kind: 'circle',
        center,
        radius: rx * scale,
        style
      })
      return
    }
    primitives.push({
      kind: 'ellipse',
      center,
      rx: rx * scale,
      ry: ry * scale,
      // Y-flip reverses rotation sense for the major axis.
      rotation: -acdbSvgMatrixRotation(full),
      style
    })
    return
  }

  const segments = 32
  const pts: AcDbSvgPoint[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(
      toCad(ctm, yFlip, cx + rx * Math.cos(a), cy + ry * Math.sin(a))
    )
  }
  primitives.push({ kind: 'polyline', points: pts, closed: true, style })
}

function emitText(
  el: ElementNode,
  ctm: AcGeMatrix2d,
  yFlip: AcGeMatrix2d,
  style: AcDbSvgStyle,
  primitives: AcDbSvgPrimitive[]
) {
  const x = propNum(el, 'x')
  const y = propNum(el, 'y')
  const fontSize = parseFontSize(el) || 12
  const text = collectText(el).trim()
  if (!text) return
  const scale = acdbSvgMatrixUniformScale(ctm)
  const full = ctm.clone().premultiply(yFlip)
  primitives.push({
    kind: 'text',
    position: toCad(ctm, yFlip, x, y),
    text,
    height: fontSize * scale,
    // Y-flip reverses rotation sense for text baseline.
    rotation: -acdbSvgMatrixRotation(full),
    style
  })
}

function collectText(el: ElementNode): string {
  let out = ''
  for (const child of el.children) {
    if (typeof child === 'string') {
      out += child
      continue
    }
    if (child.type === 'text') {
      if (typeof child.value === 'string') out += child.value
      else if (typeof child.value === 'number') out += String(child.value)
      continue
    }
    if (
      child.type === 'element' &&
      (child.tagName ?? '').toLowerCase() === 'tspan'
    ) {
      out += collectText(child)
    }
  }
  return out
}

function toCad(
  ctm: AcGeMatrix2d,
  yFlip: AcGeMatrix2d,
  x: number,
  y: number
): AcDbSvgPoint {
  const p = acdbSvgTransformPoint(ctm, x, y)
  return acdbSvgTransformPoint(yFlip, p.x, p.y)
}

function resolveViewBox(root: ElementNode): AcDbSvgViewBox {
  const vb = propString(root, 'viewBox') ?? propString(root, 'viewbox')
  if (vb) {
    const parts = vb
      .trim()
      .split(/[\s,]+/)
      .map(Number.parseFloat)
    if (parts.length >= 4 && parts.every(Number.isFinite)) {
      return {
        minX: parts[0],
        minY: parts[1],
        width: parts[2],
        height: parts[3]
      }
    }
  }
  // SVG default viewport when width/height/viewBox are omitted is 300×150.
  const width = parseLength(propString(root, 'width')) ?? 300
  const height = parseLength(propString(root, 'height')) ?? 150
  return { minX: 0, minY: 0, width, height }
}

function parseLength(value: string | undefined): number | undefined {
  if (!value) return undefined
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+))/.exec(value.trim())
  if (!m) return undefined
  const n = Number.parseFloat(m[1])
  return Number.isFinite(n) ? n : undefined
}

function propNum(el: ElementNode, name: string, fallback = 0): number {
  const raw = el.properties?.[name]
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function propString(el: ElementNode, name: string): string | undefined {
  const raw = el.properties?.[name]
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number') return String(raw)
  return undefined
}

function parsePoints(raw: string): AcDbSvgPoint[] {
  const nums = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number.parseFloat)
  const pts: AcDbSvgPoint[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (Number.isFinite(nums[i]) && Number.isFinite(nums[i + 1])) {
      pts.push({ x: nums[i], y: nums[i + 1] })
    }
  }
  return pts
}

function readStyle(el: ElementNode): AcDbSvgStyle {
  const style: AcDbSvgStyle = {}
  const stroke = propString(el, 'stroke')
  if (stroke && stroke !== 'none') style.stroke = stroke
  const sw = propNum(el, 'stroke-width', Number.NaN)
  if (Number.isFinite(sw)) style.strokeWidth = sw

  const css = propString(el, 'style')
  if (css) {
    for (const part of css.split(';')) {
      const [k, v] = part.split(':').map(s => s.trim())
      if (!k || v == null) continue
      if (k === 'stroke' && v !== 'none') style.stroke = v
      if (k === 'stroke-width') {
        const n = Number.parseFloat(v)
        if (Number.isFinite(n)) style.strokeWidth = n
      }
    }
  }
  return style
}

function parseFontSize(el: ElementNode): number {
  const attr = el.properties?.['font-size']
  if (typeof attr === 'number' && Number.isFinite(attr)) return attr
  if (typeof attr === 'string') {
    const n = parseLength(attr)
    if (n != null) return n
  }
  const css = propString(el, 'style')
  if (css) {
    const m = /font-size\s*:\s*([^;]+)/i.exec(css)
    if (m) {
      const n = parseLength(m[1].trim())
      if (n != null) return n
    }
  }
  return 0
}
