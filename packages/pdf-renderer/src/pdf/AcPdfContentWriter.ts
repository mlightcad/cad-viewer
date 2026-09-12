import { AcGeMatrix3d } from '@mlightcad/data-model'
import {
  appendBezierCurve,
  closePath,
  concatTransformationMatrix,
  LineCapStyle,
  LineJoinStyle,
  lineTo,
  moveTo,
  PDFContentStream,
  PDFDict,
  PDFDocument,
  PDFImage,
  PDFName,
  PDFOperator,
  PDFOperatorNames,
  PDFPage,
  PDFRef,
  popGraphicsState,
  pushGraphicsState,
  setDashPattern,
  setFillingRgbColor,
  setGraphicsState,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingRgbColor,
  stroke
} from 'pdf-lib'

import { AcPdfMatrixUtil } from '../renderer/AcPdfMatrixUtil'
import type {
  AcPdfFillStyle,
  AcPdfGradientOp,
  AcPdfOp,
  AcPdfPoint
} from '../renderer/AcPdfStyle'
import {
  beginEntityOperator,
  beginOcgOperator,
  beginSpanActualText,
  endMarkedContent
} from './AcPdfMarkedContent'
import { setPageNamedResource } from './AcPdfOcgManager'

const fillEvenOdd = () => PDFOperator.of(PDFOperatorNames.FillEvenOdd)
const clipEvenOdd = () => PDFOperator.of(PDFOperatorNames.ClipEvenOdd)
const endPath = () => PDFOperator.of(PDFOperatorNames.EndPath)

const KAPPA = 0.5522847498307936

export interface AcPdfContentWriterOptions {
  /**
   * Floor for `w` in drawing units so strokes remain visible after the
   * page CTM. `0` CAD hairlines are raised to this value.
   */
  minUserLineWidth?: number
}

/**
 * Thin wrapper around pdf-lib operators in CAD drawing coordinates.
 *
 * When constructed without a page, operators are captured for a Form XObject.
 */
export class AcPdfContentWriter {
  private readonly _page: PDFPage | null
  private readonly _doc: PDFDocument
  private readonly _opacityStates = new Map<number, string>()
  private readonly _images = new Map<AcPdfOp, PDFImage>()
  private readonly _minUserLineWidth: number
  private readonly _captured: PDFOperator[] = []
  private readonly _formXObjects = new Map<string, string>()
  private _shadingCount = 0
  private _formCount = 0

  constructor(
    page: PDFPage | null,
    doc: PDFDocument,
    options: AcPdfContentWriterOptions = {}
  ) {
    this._page = page
    this._doc = doc
    this._minUserLineWidth = Math.max(options.minUserLineWidth ?? 0, 0)
  }

  get capturedOperators(): PDFOperator[] {
    return this._captured
  }

  createNestedWriter(): AcPdfContentWriter {
    return new AcPdfContentWriter(null, this._doc, {
      minUserLineWidth: this._minUserLineWidth
    })
  }

  /**
   * Paints `paint` into a cached Form XObject and returns its resource name.
   */
  ensureForm(
    key: string,
    bbox: { minX: number; minY: number; maxX: number; maxY: number },
    paint: (formWriter: AcPdfContentWriter) => void
  ): string | null {
    const existing = this._formXObjects.get(key)
    if (existing) {
      return existing
    }
    const formWriter = this.createNestedWriter()
    paint(formWriter)
    if (formWriter.capturedOperators.length === 0) {
      return null
    }
    const ref = this.createFormXObject(formWriter.capturedOperators, bbox)
    return this.registerForm(key, ref)
  }

  private push(...ops: PDFOperator[]) {
    if (this._page) {
      this._page.pushOperators(...ops)
    } else {
      this._captured.push(...ops)
    }
  }

  save() {
    this.push(pushGraphicsState())
  }

  restore() {
    this.push(popGraphicsState())
  }

  /**
   * Installs a rectangular clip in the current user space (even-odd).
   * Caller must {@link save} first and {@link restore} after clipped draws.
   */
  clipRect(box: { min: { x: number; y: number }; max: { x: number; y: number } }) {
    this.push(
      moveTo(box.min.x, box.min.y),
      lineTo(box.max.x, box.min.y),
      lineTo(box.max.x, box.max.y),
      lineTo(box.min.x, box.max.y),
      closePath(),
      clipEvenOdd(),
      endPath()
    )
  }

  concatMatrix(matrix: AcGeMatrix3d) {
    const m = AcPdfMatrixUtil.toPdfMatrix(matrix)
    this.push(concatTransformationMatrix(m.a, m.b, m.c, m.d, m.e, m.f))
  }

  beginOcg(resourceName: string) {
    this.push(beginOcgOperator(resourceName))
  }

  beginActualText(text: string) {
    this.push(beginSpanActualText(this._doc.context, text))
  }

  beginEntity(payload: {
    handle?: string
    type?: string
    name?: string
    layer?: string
  }) {
    this.push(beginEntityOperator(this._doc.context, payload))
  }

  endMarked() {
    this.push(endMarkedContent())
  }

  invokeForm(resourceName: string) {
    this.push(PDFOperator.of(PDFOperatorNames.DrawObject, [PDFName.of(resourceName)]))
  }

  registerForm(key: string, ref: PDFRef): string {
    const existing = this._formXObjects.get(key)
    if (existing) {
      return existing
    }
    const name = `Fm${++this._formCount}`
    this._formXObjects.set(key, name)
    if (this._page) {
      this._page.node.setXObject(PDFName.of(name), ref)
    }
    return name
  }

  hasForm(key: string): string | undefined {
    return this._formXObjects.get(key)
  }

  async embedImage(op: Extract<AcPdfOp, { kind: 'image' }>) {
    if (this._images.has(op) || op.bytes.byteLength === 0) {
      return
    }
    try {
      const image =
        op.format === 'jpg'
          ? await this._doc.embedJpg(op.bytes)
          : await this._doc.embedPng(op.bytes)
      this._images.set(op, image)
    } catch {
      // Skip images pdf-lib cannot embed (for example SVG bytes).
    }
  }

  drawOp(op: AcPdfOp) {
    if (op.kind === 'stroke') {
      this.strokePolyline(op.points, op.style, op.closed === true)
      return
    }
    if (op.kind === 'fill') {
      this.fillLoops(op.loops, op.style)
      return
    }
    if (op.kind === 'circle') {
      this.fillCircle(op.x, op.y, op.r, op.style)
      return
    }
    if (op.kind === 'gradient') {
      this.fillGradient(op)
      return
    }
    this.drawEmbeddedImage(op)
  }

  createFormXObject(
    operators: PDFOperator[],
    bbox: { minX: number; minY: number; maxX: number; maxY: number },
    resources?: PDFDict
  ): PDFRef {
    const dict = this._doc.context.obj({
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [bbox.minX, bbox.minY, bbox.maxX, bbox.maxY],
      Matrix: [1, 0, 0, 1, 0, 0],
      ...(resources ? { Resources: resources } : {})
    })
    const stream = PDFContentStream.of(dict, operators, false)
    return this._doc.context.register(stream)
  }

  private drawEmbeddedImage(op: Extract<AcPdfOp, { kind: 'image' }>) {
    const image = this._images.get(op)
    if (!image || !(op.width > 0) || !(op.height > 0) || !this._page) {
      return
    }
    this._page.drawImage(image, {
      x: op.x,
      y: op.y,
      width: op.width,
      height: op.height
    })
  }

  private applyOpacity(opacity: number) {
    if (opacity >= 0.999) {
      return
    }
    const key = this.ensureOpacityState(opacity)
    this.push(setGraphicsState(key))
  }

  private ensureOpacityState(opacity: number): string {
    const rounded = Math.round(opacity * 1000) / 1000
    const existing = this._opacityStates.get(rounded)
    if (existing) {
      return existing
    }
    const name = `GS${this._opacityStates.size + 1}`
    const dict = this._doc.context.obj({
      Type: 'ExtGState',
      CA: rounded,
      ca: rounded
    })
    if (this._page) {
      this._page.node.setExtGState(PDFName.of(name), dict)
    }
    this._opacityStates.set(rounded, name)
    return name
  }

  private strokePolyline(
    points: AcPdfPoint[],
    style: {
      rgb: { r: number; g: number; b: number }
      opacity: number
      lineWidth: number
      dashArray?: number[]
    },
    closed: boolean
  ) {
    if (points.length < 2) {
      return
    }
    this.save()
    this.applyOpacity(style.opacity)
    const lineWidth = Math.max(style.lineWidth, this._minUserLineWidth)
    this.push(
      setStrokingRgbColor(style.rgb.r, style.rgb.g, style.rgb.b),
      setLineWidth(lineWidth),
      setLineCap(LineCapStyle.Round),
      setLineJoin(LineJoinStyle.Round)
    )
    if (style.dashArray && style.dashArray.length > 0) {
      this.push(setDashPattern(style.dashArray, 0))
    }
    this.appendPolyline(points, closed)
    this.push(stroke())
    this.restore()
  }

  private fillLoops(loops: AcPdfPoint[][], style: AcPdfFillStyle) {
    if (loops.length === 0) {
      return
    }
    this.save()
    this.applyOpacity(style.opacity)
    this.push(setFillingRgbColor(style.rgb.r, style.rgb.g, style.rgb.b))
    for (const loop of loops) {
      if (loop.length < 3) {
        continue
      }
      this.appendPolyline(loop, true)
    }
    this.push(fillEvenOdd())
    this.restore()
  }

  private fillGradient(op: AcPdfGradientOp) {
    if (op.loops.length === 0 || !this._page) {
      return
    }
    this.save()
    this.applyOpacity(op.style.opacity)
    for (const loop of op.loops) {
      if (loop.length < 3) {
        continue
      }
      this.appendPolyline(loop, true)
    }
    this.push(clipEvenOdd(), endPath())

    if (op.strips && op.strips.length > 0) {
      for (const strip of op.strips) {
        if (strip.points.length < 3) {
          continue
        }
        this.push(setFillingRgbColor(strip.rgb.r, strip.rgb.g, strip.rgb.b))
        this.appendPolyline(strip.points, true)
        this.push(fillEvenOdd())
      }
      this.restore()
      return
    }

    const name = `Sh${++this._shadingCount}`
    const functionDict = this._doc.context.obj({
      FunctionType: 2,
      Domain: [0, 1],
      C0: [op.c0.r, op.c0.g, op.c0.b],
      C1: [op.c1.r, op.c1.g, op.c1.b],
      N: 1
    })
    const shading = this._doc.context.obj({
      ShadingType: op.shadingType,
      ColorSpace: 'DeviceRGB',
      Coords: op.coords,
      Function: functionDict,
      Extend: [true, true]
    })
    const shadingRef = this._doc.context.register(shading)
    setPageNamedResource(this._page, 'Shading', name, shadingRef)
    this.push(PDFOperator.of('sh' as never, [PDFName.of(name)]))
    this.restore()
  }

  private fillCircle(x: number, y: number, r: number, style: AcPdfFillStyle) {
    if (!(r > 0)) {
      return
    }
    this.save()
    this.applyOpacity(style.opacity)
    this.push(setFillingRgbColor(style.rgb.r, style.rgb.g, style.rgb.b))
    const ox = r * KAPPA
    this.push(
      moveTo(x + r, y),
      appendBezierCurve(x + r, y + ox, x + ox, y + r, x, y + r),
      appendBezierCurve(x - ox, y + r, x - r, y + ox, x - r, y),
      appendBezierCurve(x - r, y - ox, x - ox, y - r, x, y - r),
      appendBezierCurve(x + ox, y - r, x + r, y - ox, x + r, y),
      closePath(),
      fillEvenOdd()
    )
    this.restore()
  }

  private appendPolyline(points: AcPdfPoint[], closed: boolean) {
    const first = points[0]
    this.push(moveTo(first.x, first.y))
    for (let i = 1; i < points.length; i++) {
      this.push(lineTo(points[i].x, points[i].y))
    }
    if (closed) {
      this.push(closePath())
    }
  }
}
