import type { AcDbDimStyleTableRecord } from '@mlightcad/data-model'

import {
  buildDimStylePreview,
  DIM_PREVIEW_HEIGHT,
  DIM_PREVIEW_WIDTH,
  type DimPreviewScene,
  type DimPreviewText
} from './dimStylePreview'

/**
 * Renders the shared dim-style preview scene into an SVG element (plain DOM).
 * Same geometry as the Dimension Style Manager preview.
 */
export function acedRenderDimStylePreview(
  style?: AcDbDimStyleTableRecord,
  target?: SVGSVGElement
): SVGSVGElement {
  const svg =
    target ??
    (typeof document !== 'undefined'
      ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      : (undefined as unknown as SVGSVGElement))
  if (!svg) {
    throw new Error('acedRenderDimStylePreview requires a DOM')
  }
  svg.setAttribute('viewBox', `0 0 ${DIM_PREVIEW_WIDTH} ${DIM_PREVIEW_HEIGHT}`)
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.replaceChildren()
  paintScene(svg, buildDimStylePreview(style))
  return svg
}

function paintScene(svg: SVGSVGElement, scene: DimPreviewScene) {
  const ns = 'http://www.w3.org/2000/svg'
  for (const line of scene.lines) {
    const el = document.createElementNS(ns, 'line')
    el.setAttribute('x1', String(line.x1))
    el.setAttribute('y1', String(line.y1))
    el.setAttribute('x2', String(line.x2))
    el.setAttribute('y2', String(line.y2))
    el.setAttribute('stroke', line.stroke)
    el.setAttribute('stroke-width', String(line.strokeWidth))
    el.setAttribute('stroke-linecap', 'butt')
    svg.appendChild(el)
  }
  for (const path of scene.paths) {
    const el = document.createElementNS(ns, 'path')
    el.setAttribute('d', path.d)
    el.setAttribute('stroke', path.stroke)
    el.setAttribute('stroke-width', String(path.strokeWidth))
    el.setAttribute('fill', path.fill)
    el.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(el)
  }
  for (const circle of scene.circles) {
    const el = document.createElementNS(ns, 'circle')
    el.setAttribute('cx', String(circle.cx))
    el.setAttribute('cy', String(circle.cy))
    el.setAttribute('r', String(circle.r))
    el.setAttribute('stroke', circle.stroke)
    el.setAttribute('stroke-width', String(circle.strokeWidth))
    el.setAttribute('fill', circle.fill)
    svg.appendChild(el)
  }
  for (const text of scene.texts) {
    const g = document.createElementNS(ns, 'g')
    const transform = textTransform(text)
    if (transform) g.setAttribute('transform', transform)
    if (text.box) {
      const rect = document.createElementNS(ns, 'rect')
      rect.setAttribute('x', String(text.box.x))
      rect.setAttribute('y', String(text.box.y))
      rect.setAttribute('width', String(text.box.w))
      rect.setAttribute('height', String(text.box.h))
      rect.setAttribute('fill', text.background || 'none')
      rect.setAttribute('stroke', text.frame || 'none')
      rect.setAttribute('stroke-width', '1')
      rect.setAttribute('stroke-linejoin', 'miter')
      g.appendChild(rect)
    }
    const el = document.createElementNS(ns, 'text')
    el.setAttribute('x', String(text.x))
    el.setAttribute('y', String(text.y))
    el.setAttribute('font-size', String(text.fontSize))
    el.setAttribute('text-anchor', text.textAnchor)
    el.setAttribute('fill', text.fill)
    el.textContent = text.text
    g.appendChild(el)
    svg.appendChild(g)
  }
}

function textTransform(text: DimPreviewText): string {
  const parts: string[] = []
  if (text.mirror) {
    parts.push(`translate(${2 * text.x} 0)`, 'scale(-1 1)')
  }
  if (text.rotation) {
    parts.push(`rotate(${text.rotation} ${text.x} ${text.y})`)
  }
  return parts.join(' ')
}
