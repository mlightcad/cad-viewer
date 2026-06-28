import type { AcEdBaseView } from '@mlightcad/cad-simple-viewer'
import {
  AcDbCircle,
  AcDbEllipse,
  AcDbLeader,
  AcDbLine,
  AcDbMText,
  type AcDbObjectId,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d} from '@mlightcad/data-model'

import {
  buildCloudPolyline,
  buildRectPolyline
} from '../geometry/annotationGeometry'
import type { AnnotationRecord } from '../model/types'
import { asTrView } from '../util/annotationUtil'
import { applyEntityStyle, styleToCssColor } from './applyEntityStyle'

function pixelsToWorldY(view: AcEdBaseView, pixels: number): number {
  const p0 = view.screenToWorld({ x: 0, y: 0 })
  const p1 = view.screenToWorld({ x: 0, y: pixels })
  return Math.max(Math.abs(p1.y - p0.y), 1e-4)
}

const HTML_LAYER = 'annotation'
const POSITIVE_NORMAL = { x: 0, y: 0, z: 1 }

type RenderHandles = {
  transientIds: AcDbObjectId[]
  htmlIds: string[]
}

function makeTextElement(
  record: AnnotationRecord,
  onSelect?: (id: string) => void
): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'ml-ann-html-text'
  el.textContent = record.content?.text ?? ''
  el.style.color = styleToCssColor(record.style.textColor)
  el.style.background = styleToCssColor(record.style.fillColor)
  el.style.border = `1px solid ${styleToCssColor(record.style.lineColor)}`
  el.style.padding = '2px 6px'
  el.style.fontSize = '12px'
  el.style.borderRadius = '3px'
  el.style.cursor = 'pointer'
  el.style.maxWidth = '240px'
  el.style.whiteSpace = 'pre-wrap'
  if (onSelect) {
    el.addEventListener('click', e => {
      e.stopPropagation()
      onSelect(record.id)
    })
  }
  return el
}

function makeImageElement(
  record: AnnotationRecord,
  onSelect?: (id: string) => void
): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'ml-ann-html-media'
  const img = document.createElement('img')
  const mime = record.content?.mediaMimeType ?? 'image/png'
  const data = record.content?.mediaData ?? ''
  img.src = data.startsWith('data:') ? data : `data:${mime};base64,${data}`
  img.style.maxWidth = `${(record.geometry as { width?: number }).width ?? 120}px`
  img.style.maxHeight = '120px'
  img.style.display = 'block'
  img.style.cursor = 'pointer'
  wrap.appendChild(img)
  if (onSelect) {
    wrap.addEventListener('click', e => {
      e.stopPropagation()
      onSelect(record.id)
    })
  }
  return wrap
}

function makeVideoElement(
  record: AnnotationRecord,
  onSelect?: (id: string) => void
): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'ml-ann-html-media'
  const video = document.createElement('video')
  const mime = record.content?.mediaMimeType ?? 'video/webm'
  const data = record.content?.mediaData ?? ''
  video.src = data.startsWith('data:') ? data : `data:${mime};base64,${data}`
  video.controls = true
  video.style.maxWidth = '200px'
  video.style.maxHeight = '150px'
  wrap.appendChild(video)
  if (onSelect) {
    wrap.addEventListener('click', e => {
      e.stopPropagation()
      onSelect(record.id)
    })
  }
  return wrap
}

function makeAudioElement(
  record: AnnotationRecord,
  onSelect?: (id: string) => void
): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'ml-ann-html-media'
  const audio = document.createElement('audio')
  const mime = record.content?.mediaMimeType ?? 'audio/webm'
  const data = record.content?.mediaData ?? ''
  audio.src = data.startsWith('data:') ? data : `data:${mime};base64,${data}`
  audio.controls = true
  wrap.appendChild(audio)
  if (onSelect) {
    wrap.addEventListener('click', e => {
      e.stopPropagation()
      onSelect(record.id)
    })
  }
  return wrap
}

/**
 * Renders annotation records as transient CAD entities and HTML overlays.
 */
export class AcApAnnotationRenderer {
  private handles = new Map<string, RenderHandles>()
  private currentLayoutId = ''
  private onSelect?: (id: string) => void

  constructor(
    private getView: () => AcEdBaseView | undefined,
    onSelect?: (id: string) => void
  ) {
    this.onSelect = onSelect
  }

  setOnSelect(handler: (id: string) => void) {
    this.onSelect = handler
  }

  setCurrentLayoutId(layoutSpaceId: string) {
    this.currentLayoutId = layoutSpaceId
    this.syncVisibilityByLayout()
  }

  syncAll(records: readonly AnnotationRecord[]) {
    this.clear()
    for (const record of records) {
      this.add(record)
    }
  }

  add(record: AnnotationRecord) {
    this.remove(record.id)
    if (!record.visible) {
      this.handles.set(record.id, { transientIds: [], htmlIds: [] })
      return
    }
    const view = this.getView()
    if (!view) return
    const trView = asTrView(view)

    const transientIds: AcDbObjectId[] = []
    const htmlIds: string[] = []
    const ht = trView.htmlTransientManager

    const renderCad = (
      entity: AcDbLine | AcDbPolyline | AcDbCircle | AcDbEllipse | AcDbLeader | AcDbMText | Array<AcDbLine>
    ) => {
      const list = Array.isArray(entity) ? entity : [entity]
      for (const ent of list) {
        applyEntityStyle(ent, record.style)
        view.addTransientEntity(ent)
        transientIds.push(ent.objectId)
      }
    }

    switch (record.type) {
      case 'line': {
        const g = record.geometry as { p1: { x: number; y: number }; p2: { x: number; y: number } }
        const line = new AcDbLine(
          { x: g.p1.x, y: g.p1.y, z: 0 },
          { x: g.p2.x, y: g.p2.y, z: 0 }
        )
        renderCad(line)
        break
      }
      case 'rect': {
        const g = record.geometry as { box: { min: { x: number; y: number }; max: { x: number; y: number } } }
        const poly = new AcDbPolyline()
        buildRectPolyline(
          poly,
          g.box.min,
          g.box.max
        )
        renderCad(poly)
        break
      }
      case 'cloud': {
        const g = record.geometry as { box: { min: { x: number; y: number }; max: { x: number; y: number } } }
        const poly = new AcDbPolyline()
        buildCloudPolyline(poly, g.box.min, g.box.max, view)
        renderCad(poly)
        break
      }
      case 'freehand': {
        const g = record.geometry as { points: { x: number; y: number }[] }
        const poly = new AcDbPolyline()
        g.points.forEach((p, i) => poly.addVertexAt(i, new AcGePoint2d(p)))
        renderCad(poly)
        break
      }
      case 'ellipse': {
        const g = record.geometry as {
          center: { x: number; y: number }
          majorAxis: { x: number; y: number }
          ratio: number
        }
        const majorLen = Math.hypot(g.majorAxis.x, g.majorAxis.y)
        const ellipse = new AcDbEllipse(
          { x: g.center.x, y: g.center.y, z: 0 },
          POSITIVE_NORMAL,
          { x: g.majorAxis.x, y: g.majorAxis.y, z: 0 },
          majorLen,
          majorLen * g.ratio,
          0,
          Math.PI * 2
        )
        renderCad(ellipse)
        break
      }
      case 'arrow': {
        const g = record.geometry as {
          p1: { x: number; y: number }
          p2: { x: number; y: number }
        }
        const line = new AcDbLine(
          { x: g.p1.x, y: g.p1.y, z: 0 },
          { x: g.p2.x, y: g.p2.y, z: 0 }
        )
        const dx = g.p2.x - g.p1.x
        const dy = g.p2.y - g.p1.y
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        const head = Math.min(len * 0.2, pixelsToWorldY(view, 12))
        const left = new AcDbLine(
          { x: g.p2.x, y: g.p2.y, z: 0 },
          {
            x: g.p2.x - ux * head - uy * head * 0.5,
            y: g.p2.y - uy * head + ux * head * 0.5,
            z: 0
          }
        )
        const right = new AcDbLine(
          { x: g.p2.x, y: g.p2.y, z: 0 },
          {
            x: g.p2.x - ux * head + uy * head * 0.5,
            y: g.p2.y - uy * head - ux * head * 0.5,
            z: 0
          }
        )
        renderCad([line, left, right])
        break
      }
      case 'leader': {
        const g = record.geometry as {
          anchor: { x: number; y: number }
          elbow?: { x: number; y: number }
          textPoint: { x: number; y: number }
          text: string
        }
        const leader = new AcDbLeader()
        leader.appendVertex(new AcGePoint3d(g.anchor))
        if (g.elbow) {
          leader.appendVertex(new AcGePoint3d(g.elbow))
        }
        leader.appendVertex(new AcGePoint3d(g.textPoint))
        renderCad(leader)
        const mtext = new AcDbMText()
        mtext.location = new AcGePoint3d(g.textPoint)
        mtext.contents = g.text
        mtext.height = pixelsToWorldY(view, 14)
        applyEntityStyle(mtext, record.style)
        renderCad(mtext)
        break
      }
      case 'text': {
        const g = record.geometry as { anchor: { x: number; y: number } }
        const id = `${record.id}-text`
        const el = makeTextElement(record, this.onSelect)
        ht.add(id, el, g.anchor, HTML_LAYER)
        htmlIds.push(id)
        break
      }
      case 'image': {
        const g = record.geometry as { anchor: { x: number; y: number } }
        const id = `${record.id}-img`
        const el = makeImageElement(record, this.onSelect)
        ht.add(id, el, g.anchor, HTML_LAYER)
        htmlIds.push(id)
        break
      }
      case 'video': {
        const g = record.geometry as { anchor: { x: number; y: number } }
        const id = `${record.id}-video`
        const el = makeVideoElement(record, this.onSelect)
        ht.add(id, el, g.anchor, HTML_LAYER)
        htmlIds.push(id)
        break
      }
      case 'audio': {
        const g = record.geometry as { anchor: { x: number; y: number } }
        const id = `${record.id}-audio`
        const el = makeAudioElement(record, this.onSelect)
        ht.add(id, el, g.anchor, HTML_LAYER)
        htmlIds.push(id)
        break
      }
      default:
        break
    }

    this.handles.set(record.id, { transientIds, htmlIds })
    this.syncVisibilityByLayout(record)
  }

  update(record: AnnotationRecord) {
    this.add(record)
  }

  remove(id: string) {
    const view = this.getView()
    const handles = this.handles.get(id)
    if (!handles || !view) {
      this.handles.delete(id)
      return
    }
    for (const oid of handles.transientIds) {
      view.removeTransientEntity(oid)
    }
    const ht = asTrView(view).htmlTransientManager
    for (const htmlId of handles.htmlIds) {
      ht.remove(htmlId)
    }
    this.handles.delete(id)
  }

  clear() {
    for (const id of this.handles.keys()) {
      this.remove(id)
    }
  }

  setVisible(visible: boolean, id?: string) {
    const view = this.getView()
    if (!view) return
    const ht = asTrView(view).htmlTransientManager
    if (id) {
      const handles = this.handles.get(id)
      if (!handles) return
      for (const oid of handles.transientIds) {
        if (visible) {
          // re-add not trivial; full refresh preferred
        } else {
          view.removeTransientEntity(oid)
        }
      }
      ht.setVisible(visible, HTML_LAYER)
      return
    }
    ht.setVisible(visible, HTML_LAYER)
  }

  dispose() {
    this.clear()
    const view = this.getView()
    if (view) {
      asTrView(view).htmlTransientManager.clear(HTML_LAYER)
    }
  }

  private syncVisibilityByLayout(record?: AnnotationRecord) {
    const view = this.getView()
    if (!view) return
    const layoutId = this.currentLayoutId
    const ht = asTrView(view).htmlTransientManager
    if (record) {
      const show =
        record.visible && record.layoutSpaceId === layoutId
      ht.setVisible(show, HTML_LAYER)
      return
    }
    for (const [id, handles] of this.handles) {
      const ann = id
      void ann
      void handles
    }
    ht.setVisible(true, HTML_LAYER)
  }

  /** Picks nearest annotation id near a world point within tolerance. */
  pickNearest(
    records: readonly AnnotationRecord[],
    point: { x: number; y: number },
    toleranceWorld: number
  ): string | undefined {
    let bestId: string | undefined
    let bestDist = toleranceWorld
    for (const record of records) {
      if (record.layoutSpaceId !== this.currentLayoutId) continue
      const g = record.geometry as unknown as Record<string, unknown>
      let anchor = { x: 0, y: 0 }
      if (g.anchor) anchor = g.anchor as { x: number; y: number }
      else if (g.center) anchor = g.center as { x: number; y: number }
      else if (g.p1 && g.p2) {
        anchor = {
          x: ((g.p1 as { x: number }).x + (g.p2 as { x: number }).x) / 2,
          y: ((g.p1 as { y: number }).y + (g.p2 as { y: number }).y) / 2
        }
      } else if (g.box) {
        const box = g.box as {
          min: { x: number; y: number }
          max: { x: number; y: number }
        }
        anchor = {
          x: (box.min.x + box.max.x) / 2,
          y: (box.min.y + box.max.y) / 2
        }
      }
      const dist = Math.hypot(point.x - anchor.x, point.y - anchor.y)
      if (dist <= bestDist) {
        bestDist = dist
        bestId = record.id
      }
    }
    return bestId
  }
}