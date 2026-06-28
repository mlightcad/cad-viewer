import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import {
  AcEdBaseView,
  AcEdPreviewJig
} from '@mlightcad/cad-simple-viewer'
import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import {
  AcDbEllipse,
  AcDbLine,
  AcDbPolyline,
  AcGePoint2d,
  type AcGePoint2dLike
} from '@mlightcad/data-model'

import {
  boxFromCorners,
  buildCloudPolyline,
  buildRectPolyline
} from '../geometry/annotationGeometry'
import { AcApAnnotationCmd } from './AcApAnnotationCmd'

const POSITIVE_NORMAL = { x: 0, y: 0, z: 1 }
const MIN_SKETCH_DIST = 0.1

function sketchDistance(
  p1: AcGePoint2dLike,
  p2: AcGePoint2dLike
): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

class LineJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _line: AcDbLine
  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._line = new AcDbLine(
      { x: start.x, y: start.y, z: 0 },
      { x: start.x, y: start.y, z: 0 }
    )
  }
  get entity() {
    return this._line
  }
  update(p: AcGePoint2dLike) {
    this._line.endPoint = { x: p.x, y: p.y, z: 0 }
  }
}

class RectJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _poly = new AcDbPolyline()
  private _first: AcGePoint2d
  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._first = new AcGePoint2d(start)
  }
  get entity() {
    return this._poly
  }
  update(p: AcGePoint2dLike) {
    buildRectPolyline(this._poly, this._first, p)
  }
}

class CloudJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _poly = new AcDbPolyline()
  private _first: AcGePoint2d
  private _view: AcEdBaseView
  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._first = new AcGePoint2d(start)
    this._view = view
  }
  get entity() {
    return this._poly
  }
  update(p: AcGePoint2dLike) {
    buildCloudPolyline(this._poly, this._first, p, this._view)
  }
}

class SketchJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _poly = new AcDbPolyline()
  private _points: AcGePoint2d[] = []
  private _last: AcGePoint2d
  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._last = new AcGePoint2d(start)
    this._points = [this._last]
    this._poly.addVertexAt(0, this._last)
  }
  get entity() {
    return this._poly
  }
  get points() {
    return this._points
  }
  update(p: AcGePoint2dLike) {
    const current = new AcGePoint2d(p)
    if (sketchDistance(this._last, current) >= MIN_SKETCH_DIST) {
      this._points.push(current)
      this._last = current
      this._poly.addVertexAt(this._points.length - 1, current)
    }
  }
}

class EllipseJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private _ellipse: AcDbEllipse
  private _center: AcGePoint2dLike
  constructor(view: AcEdBaseView, center: AcGePoint2dLike) {
    super(view)
    this._center = center
    this._ellipse = new AcDbEllipse(
      center,
      POSITIVE_NORMAL,
      { x: 1, y: 0, z: 0 },
      1e-6,
      1e-6,
      0,
      Math.PI * 2
    )
  }
  get entity() {
    return this._ellipse
  }
  update(p: AcGePoint2dLike) {
    const majorLen = Math.hypot(p.x - this._center.x, p.y - this._center.y)
    this._ellipse.center = { x: this._center.x, y: this._center.y, z: 0 }
    this._ellipse.majorAxisRadius = majorLen
    this._ellipse.minorAxisRadius = majorLen
  }
}

export class AcApAnLineCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const p1 = await this.getPoint(AcApI18n.t('annotation.jig.line.firstPoint'))
    if (!p1) return
    const p2 = await this.getPoint(
      AcApI18n.t('annotation.jig.line.nextPoint'),
      new LineJig(context.view, p1)
    )
    if (!p2) return
    this.commitRecord(context, {
      type: 'line',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y } },
      style: { ...this.style }
    })
  }
}

export class AcApAnRectCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const p1 = await this.getPoint(AcApI18n.t('annotation.jig.rect.firstPoint'))
    if (!p1) return
    const p2 = await this.getPoint(
      AcApI18n.t('annotation.jig.rect.nextPoint'),
      new RectJig(context.view, p1)
    )
    if (!p2) return
    this.commitRecord(context, {
      type: 'rect',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { box: boxFromCorners(p1, p2) },
      style: { ...this.style }
    })
  }
}

export class AcApAnCloudCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const p1 = await this.getPoint(AcApI18n.t('annotation.jig.cloud.firstPoint'))
    if (!p1) return
    const p2 = await this.getPoint(
      AcApI18n.t('annotation.jig.cloud.nextPoint'),
      new CloudJig(context.view, p1)
    )
    if (!p2) return
    this.commitRecord(context, {
      type: 'cloud',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { box: boxFromCorners(p1, p2) },
      style: { ...this.style }
    })
  }
}

export class AcApAnSketchCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const p1 = await this.getPoint(AcApI18n.t('annotation.jig.sketch.firstPoint'))
    if (!p1) return
    const jig = new SketchJig(context.view, p1)
    const p2 = await this.getPoint(
      AcApI18n.t('annotation.jig.sketch.nextPoint'),
      jig
    )
    if (!p2) return
    const points = jig.points.map(p => ({ x: p.x, y: p.y }))
    const final = { x: p2.x, y: p2.y }
    if (sketchDistance(points[points.length - 1], final) > 0.01) {
      points.push(final)
    }
    this.commitRecord(context, {
      type: 'freehand',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { points },
      style: { ...this.style }
    })
  }
}

export class AcApAnEllipseCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const center = await this.getPoint(
      AcApI18n.t('annotation.jig.ellipse.center')
    )
    if (!center) return
    const axisPoint = await this.getPoint(
      AcApI18n.t('annotation.jig.ellipse.radius'),
      new EllipseJig(context.view, center)
    )
    if (!axisPoint) return
    this.commitRecord(context, {
      type: 'ellipse',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: {
        center: { x: center.x, y: center.y },
        majorAxis: {
          x: axisPoint.x - center.x,
          y: axisPoint.y - center.y
        },
        ratio: 1
      },
      style: { ...this.style }
    })
  }
}

export class AcApAnArrowCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const p1 = await this.getPoint(AcApI18n.t('annotation.jig.arrow.firstPoint'))
    if (!p1) return
    const p2 = await this.getPoint(
      AcApI18n.t('annotation.jig.arrow.nextPoint'),
      new LineJig(context.view, p1)
    )
    if (!p2) return
    this.commitRecord(context, {
      type: 'arrow',
      carrier: 'text',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: {
        p1: { x: p1.x, y: p1.y },
        p2: { x: p2.x, y: p2.y }
      },
      style: { ...this.style }
    })
  }
}