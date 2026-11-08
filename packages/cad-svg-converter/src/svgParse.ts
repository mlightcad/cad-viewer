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

/** Tags that produce geometry or are walked as containers. */
const GEOMETRY_TAGS = new Set([
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

const CONTAINER_TAGS = new Set(['svg', 'g', 'a', 'switch'])

/** Bulge for a 90° circular arc: tan(θ/4) with θ = π/2. */
const BULGE_90 = Math.tan(Math.PI / 8)

interface InheritedStyle {
  stroke?: string
  fill?: string
  strokeWidth?: number
  opacity: number
  fillOpacity: number
  strokeOpacity: number
  strokeDasharray?: number[]
  textAnchor?: 'start' | 'middle' | 'end'
  visibility: 'visible' | 'hidden' | 'collapse'
}

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

  const idMap = new Map<string, ElementNode>()
  collectIds(root, idMap)

  const useStack = new Set<string>()

  const walk = (
    el: ElementNode,
    parentCtm: AcGeMatrix2d,
    parentStyle: InheritedStyle,
    /** When true, `defs`/`symbol` content is still walked for geometry (via `use`). */
    instantiateMode: boolean
  ) => {
    const name = (el.tagName ?? '').toLowerCase()

    if (isDisplayNone(el)) return

    const localStyle = readLocalStyle(el)
    const style = mergeInherited(parentStyle, localStyle)
    if (style.visibility !== 'visible') return

    if (name === 'defs') {
      // Definitions are collected via idMap; never emit into model space.
      return
    }

    if (name === 'symbol' && !instantiateMode) {
      return
    }

    if (name === 'use') {
      emitUse(el, parentCtm, style)
      return
    }

    if (name === 'switch') {
      const local = acdbSvgParseTransform(propString(el, 'transform') ?? null)
      const ctm = parentCtm.clone().multiply(local)
      for (const child of elementChildren(el)) {
        const childName = (child.tagName ?? '').toLowerCase()
        if (
          GEOMETRY_TAGS.has(childName) ||
          CONTAINER_TAGS.has(childName) ||
          childName === 'use' ||
          childName === 'svg' ||
          childName === 'symbol'
        ) {
          walk(child, ctm, style, instantiateMode)
          break
        }
      }
      return
    }

    if (name === 'a') {
      const local = acdbSvgParseTransform(propString(el, 'transform') ?? null)
      const ctm = parentCtm.clone().multiply(local)
      for (const child of elementChildren(el)) {
        walk(child, ctm, style, instantiateMode)
      }
      return
    }

    if (name === 'svg') {
      const nestedCtm = nestedSvgCtm(el, parentCtm, el === root)
      for (const child of elementChildren(el)) {
        walk(child, nestedCtm, style, instantiateMode)
      }
      return
    }

    if (name === 'g' || (name === 'symbol' && instantiateMode)) {
      const local = acdbSvgParseTransform(propString(el, 'transform') ?? null)
      const ctm = parentCtm.clone().multiply(local)
      for (const child of elementChildren(el)) {
        walk(child, ctm, style, instantiateMode)
      }
      return
    }

    if (!GEOMETRY_TAGS.has(name)) {
      skippedElementCount++
      return
    }

    const local = acdbSvgParseTransform(propString(el, 'transform') ?? null)
    const ctm = parentCtm.clone().multiply(local)
    const leafStyle = finalizeLeafStyle(style, name)

    if (name === 'line') {
      primitives.push({
        kind: 'line',
        start: toCad(ctm, yFlip, propNum(el, 'x1'), propNum(el, 'y1')),
        end: toCad(ctm, yFlip, propNum(el, 'x2'), propNum(el, 'y2')),
        style: leafStyle
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
          style: leafStyle
        })
      }
      return
    }

    if (name === 'rect') {
      emitRect(el, ctm, yFlip, leafStyle, primitives)
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
          leafStyle
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
          leafStyle
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
          style: leafStyle
        })
      }
      return
    }

    if (name === 'text') {
      emitText(el, ctm, yFlip, leafStyle, primitives)
      return
    }

    if (name === 'tspan') {
      // Handled via parent text.
      return
    }
  }

  const emitUse = (
    el: ElementNode,
    parentCtm: AcGeMatrix2d,
    style: InheritedStyle
  ) => {
    const href =
      propString(el, 'href') ??
      propString(el, 'xlink:href') ??
      propString(el, 'xlinkHref')
    if (!href || !href.startsWith('#')) {
      skippedElementCount++
      return
    }
    const id = href.slice(1)
    if (!id || useStack.has(id)) {
      skippedElementCount++
      return
    }
    const target = idMap.get(id)
    if (!target) {
      skippedElementCount++
      return
    }

    const x = propNum(el, 'x')
    const y = propNum(el, 'y')
    const local = acdbSvgParseTransform(propString(el, 'transform') ?? null)
    const ctm = parentCtm.clone()
    if (x !== 0 || y !== 0) {
      ctm.multiply(new AcGeMatrix2d().makeTranslation(x, y))
    }
    ctm.multiply(local)

    const targetName = (target.tagName ?? '').toLowerCase()
    useStack.add(id)
    try {
      if (targetName === 'symbol' || targetName === 'svg') {
        // Include the target's own transform, then optional use width/height viewport.
        const targetLocal = acdbSvgParseTransform(
          propString(target, 'transform') ?? null
        )
        const withTarget = ctm.clone().multiply(targetLocal)
        const useViewport = useSymbolCtm(el, target, withTarget)
        for (const child of elementChildren(target)) {
          walk(child, useViewport, style, true)
        }
      } else {
        walk(target, ctm, style, true)
      }
    } finally {
      useStack.delete(id)
    }
  }

  walk(root, new AcGeMatrix2d(), defaultInherited(), false)
  return { viewBox, primitives, skippedElementCount }
}

function defaultInherited(): InheritedStyle {
  return {
    opacity: 1,
    fillOpacity: 1,
    strokeOpacity: 1,
    visibility: 'visible'
  }
}

function finalizeLeafStyle(style: InheritedStyle, tag: string): AcDbSvgStyle {
  const fillable =
    tag === 'rect' ||
    tag === 'circle' ||
    tag === 'ellipse' ||
    tag === 'polygon' ||
    tag === 'path' ||
    tag === 'polyline' ||
    tag === 'text'

  const out: AcDbSvgStyle = {
    opacity: style.opacity,
    fillOpacity: style.fillOpacity,
    strokeOpacity: style.strokeOpacity
  }

  // SVG defaults applied only at leaf: fill black, stroke none.
  if (style.fill !== undefined) {
    out.fill = style.fill
  } else if (fillable) {
    out.fill = '#000000'
  } else {
    out.fill = 'none'
  }

  if (style.stroke !== undefined) {
    out.stroke = style.stroke
  } else {
    out.stroke = 'none'
  }

  if (style.strokeWidth != null) out.strokeWidth = style.strokeWidth
  if (style.strokeDasharray) out.strokeDasharray = style.strokeDasharray
  if (style.textAnchor) out.textAnchor = style.textAnchor

  // Text is painted with fill by default; expose fill as stroke for visibility checks.
  if (
    tag === 'text' &&
    out.fill &&
    out.fill !== 'none' &&
    out.stroke === 'none'
  ) {
    out.stroke = out.fill
  }

  return out
}

function mergeInherited(
  parent: InheritedStyle,
  local: Partial<InheritedStyle> & { opacity?: number }
): InheritedStyle {
  return {
    stroke: local.stroke !== undefined ? local.stroke : parent.stroke,
    fill: local.fill !== undefined ? local.fill : parent.fill,
    strokeWidth:
      local.strokeWidth !== undefined ? local.strokeWidth : parent.strokeWidth,
    opacity:
      local.opacity !== undefined
        ? parent.opacity * local.opacity
        : parent.opacity,
    fillOpacity:
      local.fillOpacity !== undefined
        ? local.fillOpacity
        : parent.fillOpacity,
    strokeOpacity:
      local.strokeOpacity !== undefined
        ? local.strokeOpacity
        : parent.strokeOpacity,
    strokeDasharray:
      local.strokeDasharray !== undefined
        ? local.strokeDasharray
        : parent.strokeDasharray,
    textAnchor:
      local.textAnchor !== undefined ? local.textAnchor : parent.textAnchor,
    visibility:
      local.visibility !== undefined ? local.visibility : parent.visibility
  }
}

function readLocalStyle(el: ElementNode): Partial<InheritedStyle> {
  const out: Partial<InheritedStyle> = {}

  const applyPaint = (key: 'stroke' | 'fill', value: string) => {
    const v = value.trim()
    if (v === 'none' || v === 'transparent') {
      out[key] = 'none'
    } else if (v && !v.startsWith('url(')) {
      out[key] = v
    }
  }

  const stroke = propString(el, 'stroke')
  if (stroke) applyPaint('stroke', stroke)
  const fill = propString(el, 'fill')
  if (fill) applyPaint('fill', fill)

  const sw = parseLength(propString(el, 'stroke-width') ?? undefined)
  if (sw != null) out.strokeWidth = sw
  else {
    const swNum = propNum(el, 'stroke-width', Number.NaN)
    if (Number.isFinite(swNum)) out.strokeWidth = swNum
  }

  const op = parseOpacity(propString(el, 'opacity'))
  if (op != null) out.opacity = op
  const fo = parseOpacity(propString(el, 'fill-opacity'))
  if (fo != null) out.fillOpacity = fo
  const so = parseOpacity(propString(el, 'stroke-opacity'))
  if (so != null) out.strokeOpacity = so

  const dash = parseDasharray(propString(el, 'stroke-dasharray'))
  if (dash) out.strokeDasharray = dash

  const anchor = propString(el, 'text-anchor')
  if (anchor === 'start' || anchor === 'middle' || anchor === 'end') {
    out.textAnchor = anchor
  }

  const vis = propString(el, 'visibility')
  if (vis === 'hidden' || vis === 'collapse' || vis === 'visible') {
    out.visibility = vis
  }

  const css = propString(el, 'style')
  if (css) {
    for (const part of css.split(';')) {
      const colon = part.indexOf(':')
      if (colon < 0) continue
      const k = part.slice(0, colon).trim()
      const v = part.slice(colon + 1).trim()
      if (!k || !v) continue
      if (k === 'stroke') applyPaint('stroke', v)
      if (k === 'fill') applyPaint('fill', v)
      if (k === 'stroke-width') {
        const n = parseLength(v)
        if (n != null) out.strokeWidth = n
      }
      if (k === 'opacity') {
        const n = parseOpacity(v)
        if (n != null) out.opacity = n
      }
      if (k === 'fill-opacity') {
        const n = parseOpacity(v)
        if (n != null) out.fillOpacity = n
      }
      if (k === 'stroke-opacity') {
        const n = parseOpacity(v)
        if (n != null) out.strokeOpacity = n
      }
      if (k === 'stroke-dasharray') {
        const d = parseDasharray(v)
        if (d) out.strokeDasharray = d
      }
      if (k === 'text-anchor') {
        if (v === 'start' || v === 'middle' || v === 'end') out.textAnchor = v
      }
      if (k === 'visibility') {
        if (v === 'hidden' || v === 'collapse' || v === 'visible') {
          out.visibility = v
        }
      }
      if (k === 'display' && v === 'none') {
        // Handled separately via isDisplayNone for the attribute; style form too.
        out.visibility = 'hidden'
      }
    }
  }

  return out
}

function isDisplayNone(el: ElementNode): boolean {
  const display = propString(el, 'display')
  if (display === 'none') return true
  const css = propString(el, 'style')
  if (css && /(?:^|;)\s*display\s*:\s*none\s*(?:;|$)/i.test(css)) return true
  return false
}

function parseOpacity(value: string | undefined): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) return undefined
  return Math.min(1, Math.max(0, n))
}

function parseDasharray(value: string | undefined): number[] | undefined {
  if (!value || value.trim() === 'none') return undefined
  const nums = value
    .trim()
    .split(/[\s,]+/)
    .map(Number.parseFloat)
    .filter(n => Number.isFinite(n) && n >= 0)
  if (nums.length === 0) return undefined
  // SVG: odd-length lists are repeated to even length.
  if (nums.length % 2 === 1) return [...nums, ...nums]
  return nums
}

function collectIds(el: ElementNode, map: Map<string, ElementNode>) {
  const id = propString(el, 'id')
  if (id && !map.has(id)) map.set(id, el)
  for (const child of elementChildren(el)) {
    collectIds(child, map)
  }
}

function nestedSvgCtm(
  el: ElementNode,
  parentCtm: AcGeMatrix2d,
  isRoot: boolean
): AcGeMatrix2d {
  const local = acdbSvgParseTransform(propString(el, 'transform') ?? null)
  const ctm = parentCtm.clone().multiply(local)
  if (isRoot) return ctm

  const vb = resolveViewBox(el)
  const x = propNum(el, 'x')
  const y = propNum(el, 'y')
  const w = parseLength(propString(el, 'width')) ?? vb.width
  const h = parseLength(propString(el, 'height')) ?? vb.height
  if (vb.width <= 0 || vb.height <= 0 || w <= 0 || h <= 0) return ctm

  // Simple "meet" uniform scale into the nested viewport.
  const sx = w / vb.width
  const sy = h / vb.height
  const s = Math.min(sx, sy)
  const tx = x + (w - vb.width * s) / 2
  const ty = y + (h - vb.height * s) / 2

  const viewport = new AcGeMatrix2d()
  viewport.makeTranslation(tx, ty)
  viewport.multiply(new AcGeMatrix2d().makeScale(s, s))
  viewport.multiply(new AcGeMatrix2d().makeTranslation(-vb.minX, -vb.minY))
  return ctm.clone().multiply(viewport)
}

function useSymbolCtm(
  useEl: ElementNode,
  target: ElementNode,
  baseCtm: AcGeMatrix2d
): AcGeMatrix2d {
  const vb = resolveViewBox(target)
  const w =
    parseLength(propString(useEl, 'width')) ??
    parseLength(propString(target, 'width')) ??
    vb.width
  const h =
    parseLength(propString(useEl, 'height')) ??
    parseLength(propString(target, 'height')) ??
    vb.height
  if (vb.width <= 0 || vb.height <= 0 || w <= 0 || h <= 0) return baseCtm

  const sx = w / vb.width
  const sy = h / vb.height
  const s = Math.min(sx, sy)
  const tx = (w - vb.width * s) / 2
  const ty = (h - vb.height * s) / 2

  const viewport = new AcGeMatrix2d()
  viewport.makeTranslation(tx, ty)
  viewport.multiply(new AcGeMatrix2d().makeScale(s, s))
  viewport.multiply(new AcGeMatrix2d().makeTranslation(-vb.minX, -vb.minY))
  return baseCtm.clone().multiply(viewport)
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

function emitRect(
  el: ElementNode,
  ctm: AcGeMatrix2d,
  yFlip: AcGeMatrix2d,
  style: AcDbSvgStyle,
  primitives: AcDbSvgPrimitive[]
) {
  const x = propNum(el, 'x')
  const y = propNum(el, 'y')
  const w = propNum(el, 'width')
  const h = propNum(el, 'height')
  if (!(w > 0 && h > 0)) return

  let rx = propNum(el, 'rx', Number.NaN)
  let ry = propNum(el, 'ry', Number.NaN)
  if (!Number.isFinite(rx) && !Number.isFinite(ry)) {
    rx = 0
    ry = 0
  } else if (!Number.isFinite(rx)) {
    rx = ry
  } else if (!Number.isFinite(ry)) {
    ry = rx
  }
  rx = Math.max(0, Math.min(rx, w / 2))
  ry = Math.max(0, Math.min(ry, h / 2))

  if (rx <= 0 || ry <= 0) {
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
    return
  }

  // Eight vertices with 90° corner bulges (SVG Y-down clockwise).
  const ptsSvg: AcDbSvgPoint[] = [
    { x: x + rx, y },
    { x: x + w - rx, y },
    { x: x + w, y: y + ry },
    { x: x + w, y: y + h - ry },
    { x: x + w - rx, y: y + h },
    { x: x + rx, y: y + h },
    { x, y: y + h - ry },
    { x, y: y + ry }
  ]
  // Bulge on the vertex that starts each corner arc (indices 1,3,5,7).
  const bulgesSvg = [0, -BULGE_90, 0, -BULGE_90, 0, -BULGE_90, 0, -BULGE_90]

  const full = ctm.clone().premultiply(yFlip)
  const flipBulge = matrixDeterminant(full) < 0
  primitives.push({
    kind: 'polyline',
    points: ptsSvg.map(p => toCad(ctm, yFlip, p.x, p.y)),
    bulges: bulgesSvg.map(b => (flipBulge ? -b : b)),
    closed: true,
    style
  })
}

function matrixDeterminant(matrix: AcGeMatrix2d): number {
  const e = matrix.elements
  // Row-major 3x3: [a c e; b d f; 0 0 1] → det = a*d - b*c
  return e[0] * e[4] - e[1] * e[3]
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
