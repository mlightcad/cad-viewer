import { deflate } from 'pako'
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFImage,
  PDFName,
  PDFPage,
  PDFRawStream,
  PDFRef
} from 'pdf-lib'

import { AcGeMatrix3d } from '@mlightcad/data-model'

import { AcPdfMatrixUtil } from '../renderer/AcPdfMatrixUtil'
import type {
  AcPdfFillStyle,
  AcPdfGradientOp,
  AcPdfOp,
  AcPdfPoint,
  AcPdfStrokeStyle
} from '../renderer/AcPdfStyle'
import { pdfHexText } from './AcPdfMarkedContent'
import type { AcPdfFontManager } from './AcPdfFontManager'
import { setPageNamedResource } from './AcPdfOcgManager'

const KAPPA = 0.5522847498307936

export interface AcPdfContentWriterOptions {
  /**
   * Floor for `w` in drawing units so strokes remain visible after the
   * page CTM. `0` CAD hairlines are raised to this value.
   */
  minUserLineWidth?: number
  /**
   * Cache of embedded images shared across pages of one document. When
   * omitted the writer owns a private cache.
   */
  imageCache?: Map<AcPdfOp, PDFImage>
  /**
   * Document-scoped Form XObject registry shared across the pages of one
   * export so identical glyph/geometry forms are embedded once.
   */
  formRegistry?: AcPdfFormRegistry
  /** Embedded-font registry for `text` draw ops. */
  fonts?: AcPdfFontManager
}

/**
 * Document-scoped Form XObject dedup state shared by every per-page writer of
 * one export. `entries` maps stable form keys to their stream object plus the
 * resource name used on every page that invokes the form; `bufferIds` gives
 * shared flat buffers a stable identity across the per-page writers.
 */
export interface AcPdfFormRegistry {
  entries: Map<string, { name: string; ref: PDFRef }>
  bufferIds: WeakMap<Float32Array, string>
  nameSeq: number
  bufferSeq: number
}

export function createPdfFormRegistry(): AcPdfFormRegistry {
  return {
    entries: new Map(),
    bufferIds: new WeakMap(),
    nameSeq: 0,
    bufferSeq: 0
  }
}

/**
 * Flate-compresses stream bytes for embedding (`/Filter /FlateDecode`).
 * Returns `null` for tiny streams where the compression overhead outweighs
 * the savings, or when the platform deflate fails.
 */
function flateStreamBytes(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 256) {
    return null
  }
  try {
    return deflate(bytes)
  } catch {
    return null
  }
}

/**
 * Formats a number as a PDF real/integer operand.
 *
 * `String(n)` gives the shortest round-trip form; exponent notation (invalid
 * inside content streams) is expanded to plain decimal.
 */
function pdfNum(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) {
    return String(n)
  }
  if (!Number.isFinite(n)) {
    return '0'
  }
  const s = String(n)
  if (s.indexOf('e') < 0 && s.indexOf('E') < 0) {
    return s
  }
  let t = n.toFixed(20)
  if (t.indexOf('e') >= 0 || t.indexOf('E') >= 0) {
    return '0'
  }
  if (t.indexOf('.') >= 0) {
    t = t.replace(/0+$/, '').replace(/\.$/, '')
  }
  return t === '' || t === '-' ? '0' : t
}

function pdfLiteral(text: string): string {
  return (
    '(' +
    text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n') +
    ')'
  )
}

/**
 * Formats a glyph-space coordinate. Float32 buffers carry binary artifacts
 * (`0.1` reads back as `0.10000000149011612`), so values are rounded to 4
 * decimals — far below visual tolerance for text geometry — keeping both the
 * content streams and the JS string churn small.
 */
function pdfCompact(n: number): string {
  const r = Math.round(n * 1e4) / 1e4
  return Number.isFinite(r) ? String(r) : '0'
}

/** Bounding box of a flat `[x, y, ...]` coordinate buffer. */
function flatBounds(data: Float32Array): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i + 1 < data.length; i += 2) {
    const x = data[i]
    const y = data[i + 1]
    if (x < minX) {
      minX = x
    }
    if (y < minY) {
      minY = y
    }
    if (x > maxX) {
      maxX = x
    }
    if (y > maxY) {
      maxY = y
    }
  }
  return { minX, minY, maxX, maxY }
}

/** Mean of the X/Y affine scale factors of `matrix`. */
function affineScale2d(matrix: AcGeMatrix3d): number {
  const el = matrix.elements
  const sx = Math.hypot(el[0], el[1])
  const sy = Math.hypot(el[4], el[5])
  const scale = (sx + sy) / 2
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

/**
 * Serializes CAD drawables into raw PDF content-stream text.
 *
 * pdf-lib's `pushOperators` path retains one JS object graph per operand
 * (PDFNumber wrappers, arg arrays, operator objects), which multiplies large
 * drawings' content by ~20-30x in heap terms — enough to exhaust the tab on
 * drawings with millions of points. This writer emits the exact same
 * operators as compact text instead, and {@link flushToPage} registers the
 * bytes as one `PDFRawStream` appended to the page's `/Contents` array.
 */
export class AcPdfContentWriter {
  private readonly _page: PDFPage | null
  private readonly _doc: PDFDocument
  private readonly _opacityStates = new Map<number, string>()
  private readonly _images: Map<AcPdfOp, PDFImage>
  private readonly _imageNames = new Map<PDFImage, string>()
  private readonly _minUserLineWidth: number
  /** Shared Form XObject registry (per document unless overridden). */
  private readonly _forms: AcPdfFormRegistry
  /** Embedded-font registry for `text` draw ops. */
  private readonly _fonts?: AcPdfFontManager
  private readonly _chunks: string[] = []
  private readonly _segments: Uint8Array[] = []
  private _segmentLength = 0
  private _shadingCount = 0

  constructor(
    page: PDFPage | null,
    doc: PDFDocument,
    options: AcPdfContentWriterOptions = {}
  ) {
    this._page = page
    this._doc = doc
    this._minUserLineWidth = Math.max(options.minUserLineWidth ?? 0, 0)
    this._images = options.imageCache ?? new Map<AcPdfOp, PDFImage>()
    this._forms = options.formRegistry ?? createPdfFormRegistry()
    this._fonts = options.fonts
  }

  createNestedWriter(): AcPdfContentWriter {
    return new AcPdfContentWriter(null, this._doc, {
      minUserLineWidth: this._minUserLineWidth,
      imageCache: this._images,
      formRegistry: this._forms,
      fonts: this._fonts
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
    const existing = this.hasForm(key)
    if (existing) {
      return existing
    }
    const formWriter = this.createNestedWriter()
    paint(formWriter)
    const bytes = formWriter.buildBytes()
    if (bytes.length === 0) {
      return null
    }
    const ref = this.createFormXObject(bytes, bbox)
    return this.registerForm(key, ref)
  }

  flushToPage(page: PDFPage): void {
    const bytes = this.buildBytes()
    if (bytes.length === 0) {
      return
    }
    const ref = this.registerRawStream(bytes)
    // normalize() turns a direct Contents ref into an array and (on first
    // call) wraps prior streams with q/Q. Appending keeps paint order: our
    // stream is self-contained (opens with `q`, installs its own `cm`).
    page.node.normalize()
    const contents = page.node.Contents()
    if (contents instanceof PDFArray) {
      contents.push(ref)
    } else {
      page.node.set(PDFName.of('Contents'), ref)
    }
  }

  /**
   * Registers raw stream bytes, Flate-compressing large payloads
   * (`/Filter /FlateDecode`) — content streams of big drawings compress
   * ~10x, which is most of the exported file's size.
   */
  private registerRawStream(bytes: Uint8Array): PDFRef {
    const compressed = flateStreamBytes(bytes)
    const dict = this._doc.context.obj(
      compressed ? { Filter: 'FlateDecode' } : {}
    )
    return this._doc.context.register(
      PDFRawStream.of(dict, compressed ?? bytes)
    )
  }

  private compact(): void {
    if (this._chunks.length === 0) {
      return
    }
    const joined = this._chunks.join('')
    this._chunks.length = 0
    const bytes = new Uint8Array(joined.length)
    for (let i = 0; i < joined.length; i++) {
      bytes[i] = joined.charCodeAt(i) & 0xff
    }
    this._segments.push(bytes)
    this._segmentLength += bytes.length
  }

  buildBytes(): Uint8Array {
    this.compact()
    const out = new Uint8Array(this._segmentLength)
    let offset = 0
    for (const segment of this._segments) {
      out.set(segment, offset)
      offset += segment.length
    }
    return out
  }

  /** Appends a raw content-stream chunk (also used by the document writer). */
  push(chunk: string): void {
    this._chunks.push(chunk)
    // Bound the string-object count on huge drawings: join periodically.
    if (this._chunks.length >= 1024) {
      this.compact()
    }
  }

  save() {
    this.push('q\n')
  }

  restore() {
    this.push('Q\n')
  }

  /**
   * Installs a rectangular clip in the current user space (even-odd).
   * Caller must {@link save} first and {@link restore} after clipped draws.
   */
  clipRect(box: { min: { x: number; y: number }; max: { x: number; y: number } }) {
    this.push(
      `${pdfNum(box.min.x)} ${pdfNum(box.min.y)} m ` +
        `${pdfNum(box.max.x)} ${pdfNum(box.min.y)} l ` +
        `${pdfNum(box.max.x)} ${pdfNum(box.max.y)} l ` +
        `${pdfNum(box.min.x)} ${pdfNum(box.max.y)} l h W* n\n`
    )
  }

  concatMatrix(matrix: AcGeMatrix3d) {
    const m = AcPdfMatrixUtil.toPdfMatrix(matrix)
    this.push(
      `${pdfNum(m.a)} ${pdfNum(m.b)} ${pdfNum(m.c)} ${pdfNum(m.d)} ` +
        `${pdfNum(m.e)} ${pdfNum(m.f)} cm\n`
    )
  }

  beginOcg(resourceName: string) {
    this.push(`/OC /${resourceName} BDC\n`)
  }

  beginActualText(text: string) {
    this.push(`/Span << /ActualText ${pdfHexText(text)} >> BDC\n`)
  }

  beginEntity(payload: {
    handle?: string
    type?: string
    name?: string
    layer?: string
  }) {
    let dict = ''
    if (payload.handle) {
      dict += ` /Handle ${pdfLiteral(payload.handle)}`
    }
    if (payload.type) {
      dict += ` /Type ${pdfLiteral(payload.type)}`
    }
    if (payload.name) {
      dict += ` /Name ${pdfLiteral(payload.name)}`
    }
    if (payload.layer) {
      dict += ` /Layer ${pdfLiteral(payload.layer)}`
    }
    this.push(`/Entity <<${dict} >> BDC\n`)
  }

  endMarked() {
    this.push('EMC\n')
  }

  invokeForm(resourceName: string) {
    this.push(`/${resourceName} Do\n`)
  }

  /**
   * Registers (or reuses) a Form XObject under `key` and returns its resource
   * name. Names are unique document-wide through the shared registry; the
   * resource is added to this page's `/XObject` dict so cross-page reuse
   * keeps working.
   */
  registerForm(key: string, ref: PDFRef): string {
    const entry = this._forms.entries.get(key)
    if (entry) {
      this.ensurePageForm(entry.name, entry.ref)
      return entry.name
    }
    const name = `Fm${++this._forms.nameSeq}`
    this._forms.entries.set(key, { name, ref })
    this.ensurePageForm(name, ref)
    return name
  }

  hasForm(key: string): string | undefined {
    return this._forms.entries.get(key)?.name
  }

  /** Adds a form (or image) resource to the current page if one exists. */
  private ensurePageForm(name: string, ref: PDFRef): void {
    if (this._page) {
      this._page.node.setXObject(PDFName.of(name), ref)
    }
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
      this.strokePaths(
        [{ points: op.points, closed: op.closed === true }],
        op.style
      )
      return
    }
    if (op.kind === 'fill') {
      this.fillLoops(op.loops, op.style)
      return
    }
    if (op.kind === 'text') {
      this.paintText(op)
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
    if (op.kind === 'triangles') {
      this.paintTriangles(op)
      return
    }
    if (op.kind === 'polylines') {
      this.paintFlatPolylines(op)
      return
    }
    this.drawEmbeddedImage(op)
  }

  /**
   * Paints a run of ops from one entity, coalescing adjacent draws that share
   * the same style.
   *
   * Dense geometry (polyline meshes, patterned hatches, complex linetypes)
   * produces hundreds of stroke ops whose styles are identical. Independent
   * subpaths in a single stroked path render identically (caps apply per
   * subpath, no joins across moves). Consecutive opaque fills likewise
   * combine under even-odd.
   *
   * Compact glyph ops (`triangles`/`polylines`) are matched on the raw op
   * before `map` so their shared float32 buffers are never copied per
   * instance: triangles go through one Form XObject per unique glyph set
   * (color/opacity set outside, `cm` per instance), polylines serialize
   * inline with the matrix baked numerically.
   */
  drawOps(
    ops: AcPdfOp[],
    map?: (op: AcPdfOp) => AcPdfOp,
    matrix?: AcGeMatrix3d
  ) {
    const resolve = map ?? ((op: AcPdfOp) => op)
    for (let i = 0; i < ops.length; ) {
      const raw = ops[i]
      if (raw.kind === 'triangles') {
        this.paintTriangles(raw, matrix)
        i++
        continue
      }
      if (raw.kind === 'polylines') {
        this.paintFlatPolylines(raw, matrix)
        i++
        continue
      }
      const op = resolve(raw)
      if (op.kind === 'text') {
        this.paintText(op)
        i++
        continue
      }
      if (op.kind === 'stroke') {
        const paths: Array<{ points: AcPdfPoint[]; closed: boolean }> = [
          { points: op.points, closed: op.closed === true }
        ]
        let j = i + 1
        while (j < ops.length) {
          const rawNext = ops[j]
          if (
            rawNext.kind === 'triangles' ||
            rawNext.kind === 'polylines' ||
            rawNext.kind === 'image' ||
            rawNext.kind === 'gradient' ||
            rawNext.kind === 'circle' ||
            rawNext.kind === 'text'
          ) {
            break
          }
          const next = resolve(rawNext)
          if (next.kind !== 'stroke' || !sameStrokeStyle(op.style, next.style)) {
            break
          }
          paths.push({ points: next.points, closed: next.closed === true })
          j++
        }
        this.strokePaths(paths, op.style)
        i = j
        continue
      }
      if (op.kind === 'fill' && op.style.opacity >= 0.999) {
        const loops: AcPdfPoint[][] = [...op.loops]
        let j = i + 1
        while (j < ops.length) {
          const rawNext = ops[j]
          if (
            rawNext.kind === 'triangles' ||
            rawNext.kind === 'polylines' ||
            rawNext.kind === 'image' ||
            rawNext.kind === 'gradient' ||
            rawNext.kind === 'circle' ||
            rawNext.kind === 'text'
          ) {
            break
          }
          const next = resolve(rawNext)
          if (
            next.kind !== 'fill' ||
            next.style.opacity < 0.999 ||
            !sameFillStyle(op.style, next.style)
          ) {
            break
          }
          loops.push(...next.loops)
          j++
        }
        this.fillLoops(loops, op.style)
        i = j
        continue
      }
      this.drawOp(op)
      i++
    }
  }

  /**
   * Paints one laid-out line of real PDF text (`BT … ET`).
   *
   * The op's glyph string was encoded through the embedded subset font by
   * {@link AcPdfFontManager.embedOp} before painting; ops whose font failed
   * to embed (empty `hex`/`glyphHex`) are skipped. Rotation, the CAD width
   * factor and the `\Q` oblique shear collapse into the text matrix:
   * glyph advances scale by `size * hScale` along the baseline and `size`
   * perpendicular to it, sheared by `tan(oblique)` after scaling. Tracking
   * runs paint as one TJ array with per-glyph displacement numbers.
   */
  private paintText(op: Extract<AcPdfOp, { kind: 'text' }>) {
    const glyphHex = op.glyphHex
    const tracked = glyphHex !== undefined && glyphHex.length > 0
    if (!op.hex && !tracked) {
      return
    }
    const resource = this._fonts?.resourceFor(op.font)
    if (!resource) {
      return
    }
    if (this._page) {
      setPageNamedResource(this._page, 'Font', resource.name, resource.ref)
    }
    const rad = (op.angleDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    // `flipX` mirrors glyphs about their local vertical axis: the text
    // matrix x-axis is negated (R(θ)·S(-size·hScale, size)). `\Q` oblique
    // shears glyph space after scaling: Tm = R(θ)·Sh(tan)·S, so the c/d
    // columns gain a `tan·cos` / `tan·sin` term.
    const flip = op.flipX === true ? -1 : 1
    const shear = op.obliqueDeg
      ? Math.tan((op.obliqueDeg * Math.PI) / 180)
      : 0
    let chunk = 'q\n'
    chunk += this.applyOpacity(op.style.opacity)
    chunk += `${pdfNum(op.style.rgb.r)} ${pdfNum(op.style.rgb.g)} ${pdfNum(op.style.rgb.b)} rg\n`
    chunk += 'BT\n'
    chunk += `/${resource.name} 1 Tf\n`
    chunk +=
      `${pdfNum(op.size * op.hScale * cos * flip)} ${pdfNum(op.size * op.hScale * sin * flip)} ` +
      `${pdfNum(op.size * (shear * cos - sin))} ${pdfNum(op.size * (shear * sin + cos))} ` +
      `${pdfNum(op.x)} ${pdfNum(op.y)} Tm\n`
    if (tracked) {
      // Per-glyph tracking: each displacement number adds the advance that
      // tracking owes (see embedOp); zero adjustments stay out of the array.
      const adjust = op.charAdjust ?? []
      const parts: string[] = []
      glyphHex.forEach((hex, index) => {
        if (index > 0) {
          const t = adjust[index - 1] ?? 0
          if (t !== 0) {
            parts.push(pdfNum(t))
          }
        }
        parts.push(`<${hex}>`)
      })
      chunk += `[${parts.join(' ')}] TJ\nET\nQ\n`
      this.push(chunk)
      return
    }
    chunk += `<${op.hex}> Tj\nET\nQ\n`
    this.push(chunk)
  }

  /**
   * Paints a flat triangle glyph set.
   *
   * The unique glyph geometry is emitted once into a Form XObject keyed by
   * buffer identity; every instance then costs one `q cm /FmN Do Q`. Fill
   * color and opacity are installed in the graphics state before `Do` — PDF
   * forms execute inside the current graphics state, so one form serves all
   * layers/colors.
   */
  private paintTriangles(op: Extract<AcPdfOp, { kind: 'triangles' }>, matrix?: AcGeMatrix3d) {
    const data = op.data
    if (data.length < 6) {
      return
    }
    if (!this._page) {
      // Nested writer (form content): serialize inline, no color operators.
      this.push(this.bakedTrianglesChunk(data, matrix) + 'f\n')
      return
    }
    const name = this.ensureTrianglesForm(data)
    if (!name) {
      return
    }
    let chunk = 'q\n'
    chunk += this.applyOpacity(op.style.opacity)
    chunk += `${pdfNum(op.style.rgb.r)} ${pdfNum(op.style.rgb.g)} ${pdfNum(op.style.rgb.b)} rg\n`
    if (matrix) {
      const m = AcPdfMatrixUtil.toPdfMatrix(matrix)
      chunk += `${pdfNum(m.a)} ${pdfNum(m.b)} ${pdfNum(m.c)} ${pdfNum(m.d)} ${pdfNum(m.e)} ${pdfNum(m.f)} cm\n`
    }
    chunk += `/${name} Do\nQ\n`
    this.push(chunk)
  }

  /** Creates (once) and names the Form XObject for a triangle buffer. */
  private ensureTrianglesForm(data: Float32Array): string | null {
    const key = this.compactFormKey(data)
    const existing = this.hasForm(key)
    if (existing) {
      return existing
    }
    const bbox = flatBounds(data)
    if (
      !Number.isFinite(bbox.minX) ||
      !Number.isFinite(bbox.minY) ||
      !Number.isFinite(bbox.maxX) ||
      !Number.isFinite(bbox.maxY)
    ) {
      return null
    }
    const bytes = this.trianglesFormBytes(data)
    if (bytes.length === 0) {
      return null
    }
    const ref = this.createFormXObject(bytes, bbox)
    return this.registerForm(key, ref)
  }

  /** Serializes triangle geometry (paths + single fill) into PDF bytes. */
  private trianglesFormBytes(data: Float32Array): Uint8Array {
    const writer = this.createNestedWriter()
    writer.push(this.bakedTrianglesChunk(data, undefined) + 'f\n')
    return writer.buildBytes()
  }

  /** Closed-triangle subpaths for a flat triangle buffer. */
  private bakedTrianglesChunk(
    data: Float32Array,
    matrix: AcGeMatrix3d | undefined
  ): string {
    const el = matrix?.elements
    let chunk = ''
    for (let i = 0; i + 5 < data.length; i += 6) {
      chunk += this.flatPointChunk(data, i, el) + ' m '
      chunk += this.flatPointChunk(data, i + 2, el) + ' l '
      chunk += this.flatPointChunk(data, i + 4, el) + ' l h\n'
    }
    return chunk
  }

  private flatPointChunk(
    data: Float32Array,
    i: number,
    el: number[] | undefined
  ): string {
    let x = data[i]
    let y = data[i + 1]
    if (el) {
      const tx = el[0] * x + el[4] * y + el[12]
      const ty = el[1] * x + el[5] * y + el[13]
      x = tx
      y = ty
    }
    return `${pdfCompact(x)} ${pdfCompact(y)}`
  }

  /**
   * Paints a flat polyline glyph set inline (strokes carry per-instance line
   * widths, so they are not form-shared), baking the matrix numerically.
   */
  private paintFlatPolylines(
    op: Extract<AcPdfOp, { kind: 'polylines' }>,
    matrix?: AcGeMatrix3d
  ) {
    const data = op.data
    if (data.length < 5) {
      return
    }
    const el = matrix?.elements
    const scale = matrix ? affineScale2d(matrix) : 1
    const lineWidth = Math.max(
      op.style.lineWidth * scale,
      this._minUserLineWidth
    )
    let chunk = 'q\n'
    chunk += this.applyOpacity(op.style.opacity)
    chunk += `${pdfNum(op.style.rgb.r)} ${pdfNum(op.style.rgb.g)} ${pdfNum(op.style.rgb.b)} RG ${pdfNum(lineWidth)} w 1 J 1 j\n`
    if (op.style.dashArray && op.style.dashArray.length > 0) {
      chunk += `[${op.style.dashArray.map(d => pdfNum(d * scale)).join(' ')}] 0 d\n`
    }
    let i = 0
    while (i < data.length) {
      const n = data[i]
      if (!(n >= 2) || i + 1 + n * 2 > data.length) {
        break
      }
      i++
      for (let k = 0; k < n; k++) {
        let x = data[i]
        let y = data[i + 1]
        i += 2
        if (el) {
          const tx = el[0] * x + el[4] * y + el[12]
          const ty = el[1] * x + el[5] * y + el[13]
          x = tx
          y = ty
        }
        chunk += `${pdfCompact(x)} ${pdfCompact(y)} ${k === 0 ? 'm' : 'l'}\n`
      }
    }
    chunk += 'S\nQ\n'
    this.push(chunk)
  }

  /** Stable string key for a shared flat buffer (Form XObject cache key). */
  private compactFormKey(data: Float32Array): string {
    let id = this._forms.bufferIds.get(data)
    if (!id) {
      id = `tri${++this._forms.bufferSeq}`
      this._forms.bufferIds.set(data, id)
    }
    return id
  }

  createFormXObject(
    bytes: Uint8Array,
    bbox: { minX: number; minY: number; maxX: number; maxY: number },
    resources?: PDFDict
  ): PDFRef {
    const compressed = flateStreamBytes(bytes)
    const dict = this._doc.context.obj({
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [bbox.minX, bbox.minY, bbox.maxX, bbox.maxY],
      Matrix: [1, 0, 0, 1, 0, 0],
      ...(compressed ? { Filter: 'FlateDecode' } : {}),
      ...(resources ? { Resources: resources } : {})
    })
    return this._doc.context.register(
      PDFRawStream.of(dict, compressed ?? bytes)
    )
  }

  private drawEmbeddedImage(op: Extract<AcPdfOp, { kind: 'image' }>) {
    const image = this._images.get(op)
    if (!image || !(op.width > 0) || !(op.height > 0)) {
      return
    }
    const name = this.ensureImageName(image)
    this.push(
      `q ${pdfNum(op.width)} 0 0 ${pdfNum(op.height)} ` +
        `${pdfNum(op.x)} ${pdfNum(op.y)} cm /${name} Do Q\n`
    )
  }

  private ensureImageName(image: PDFImage): string {
    const existing = this._imageNames.get(image)
    if (existing) {
      return existing
    }
    const name = `Im${this._imageNames.size + 1}`
    this._imageNames.set(image, name)
    if (this._page) {
      this._page.node.setXObject(PDFName.of(name), image.ref)
    }
    return name
  }

  private applyOpacity(opacity: number): string {
    if (opacity >= 0.999) {
      return ''
    }
    const key = this.ensureOpacityState(opacity)
    return `/${key} gs\n`
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

  private strokePaths(
    paths: Array<{ points: AcPdfPoint[]; closed: boolean }>,
    style: AcPdfStrokeStyle
  ) {
    const drawable = paths.filter(path => path.points.length >= 2)
    if (drawable.length === 0) {
      return
    }
    let chunk = 'q\n'
    chunk += this.applyOpacity(style.opacity)
    const lineWidth = Math.max(style.lineWidth, this._minUserLineWidth)
    chunk +=
      `${pdfNum(style.rgb.r)} ${pdfNum(style.rgb.g)} ${pdfNum(style.rgb.b)} RG ` +
      `${pdfNum(lineWidth)} w 1 J 1 j\n`
    if (style.dashArray && style.dashArray.length > 0) {
      chunk += `[${style.dashArray.map(pdfNum).join(' ')}] 0 d\n`
    }
    for (const path of drawable) {
      chunk += this.polylineChunk(path.points, path.closed)
    }
    chunk += 'S\nQ\n'
    this.push(chunk)
  }

  private fillLoops(loops: AcPdfPoint[][], style: AcPdfFillStyle) {
    if (loops.length === 0) {
      return
    }
    let chunk = 'q\n'
    chunk += this.applyOpacity(style.opacity)
    chunk += `${pdfNum(style.rgb.r)} ${pdfNum(style.rgb.g)} ${pdfNum(style.rgb.b)} rg\n`
    for (const loop of loops) {
      if (loop.length < 3) {
        continue
      }
      chunk += this.polylineChunk(loop, true)
    }
    chunk += 'f*\nQ\n'
    this.push(chunk)
  }

  private fillGradient(op: AcPdfGradientOp) {
    if (op.loops.length === 0 || !this._page) {
      return
    }
    let chunk = 'q\n'
    chunk += this.applyOpacity(op.style.opacity)
    for (const loop of op.loops) {
      if (loop.length < 3) {
        continue
      }
      chunk += this.polylineChunk(loop, true)
    }
    chunk += 'W* n\n'
    if (op.strips && op.strips.length > 0) {
      for (const strip of op.strips) {
        if (strip.points.length < 3) {
          continue
        }
        chunk +=
          `${pdfNum(strip.rgb.r)} ${pdfNum(strip.rgb.g)} ${pdfNum(strip.rgb.b)} rg\n`
        chunk += this.polylineChunk(strip.points, true)
        chunk += 'f*\n'
      }
      this.push(chunk + 'Q\n')
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
    chunk += `/${name} sh\nQ\n`
    this.push(chunk)
  }

  private fillCircle(x: number, y: number, r: number, style: AcPdfFillStyle) {
    if (!(r > 0)) {
      return
    }
    const ox = r * KAPPA
    let chunk = 'q\n'
    chunk += this.applyOpacity(style.opacity)
    chunk += `${pdfNum(style.rgb.r)} ${pdfNum(style.rgb.g)} ${pdfNum(style.rgb.b)} rg\n`
    chunk += `${pdfNum(x + r)} ${pdfNum(y)} m `
    chunk += `${pdfNum(x + r)} ${pdfNum(y + ox)} ${pdfNum(x + ox)} ${pdfNum(y + r)} ${pdfNum(x)} ${pdfNum(y + r)} c `
    chunk += `${pdfNum(x - ox)} ${pdfNum(y + r)} ${pdfNum(x - r)} ${pdfNum(y + ox)} ${pdfNum(x - r)} ${pdfNum(y)} c `
    chunk += `${pdfNum(x - r)} ${pdfNum(y - ox)} ${pdfNum(x - ox)} ${pdfNum(y - r)} ${pdfNum(x)} ${pdfNum(y - r)} c `
    chunk += `${pdfNum(x + ox)} ${pdfNum(y - r)} ${pdfNum(x + r)} ${pdfNum(y - ox)} ${pdfNum(x + r)} ${pdfNum(y)} c `
    chunk += 'h f*\nQ\n'
    this.push(chunk)
  }

  private polylineChunk(points: AcPdfPoint[], closed: boolean): string {
    let chunk = `${pdfNum(points[0].x)} ${pdfNum(points[0].y)} m`
    for (let i = 1; i < points.length; i++) {
      chunk += ` ${pdfNum(points[i].x)} ${pdfNum(points[i].y)} l`
    }
    if (closed) {
      chunk += ' h'
    }
    return chunk + '\n'
  }
}

function sameRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b
}

function sameDashArray(a?: number[], b?: number[]): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b || a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function sameStrokeStyle(a: AcPdfStrokeStyle, b: AcPdfStrokeStyle): boolean {
  return (
    a === b ||
    (a.opacity === b.opacity &&
      a.lineWidth === b.lineWidth &&
      sameRgb(a.rgb, b.rgb) &&
      sameDashArray(a.dashArray, b.dashArray))
  )
}

function sameFillStyle(a: AcPdfFillStyle, b: AcPdfFillStyle): boolean {
  return a === b || (a.opacity === b.opacity && sameRgb(a.rgb, b.rgb))
}
