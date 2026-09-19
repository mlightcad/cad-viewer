import {
  AcCmColor,
  AcCmTransparency,
  AcDbDatabase,
  acdbDrawTessellateOptions,
  acdbRasterizeOleMetafile,
  AcDbRenderingCache,
  AcGeArea2d,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike,
  ACGI_DARK_THEME_FOREGROUND,
  ACGI_LIGHT_THEME_FOREGROUND,
  AcGiContext,
  AcGiFontMapping,
  AcGiImageStyle,
  acgiIsLightBackground,
  AcGiLineWeight,
  AcGiMTextAttachmentPoint,
  AcGiMTextData,
  AcGiPointStyle,
  AcGiRenderer,
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { PDFDocument } from 'pdf-lib'

import type { AcPdfExportOptions } from '../AcPdfExportOptions'
import { shadingFromGradient } from '../hatch/AcPdfGradient'
import { tessellateHatchPattern } from '../hatch/AcPdfHatchTessellator'
import {
  type AcPdfLineWalkPlacement,
  isComplexLineType,
  isComplexShapeElement,
  isComplexTextElement,
  resolveLinetypeEmbeddedText,
  walkLineType} from '../linetype/AcPdfLineTypeStroker'
import type { AcPdfWriteOptions } from '../pdf/AcPdfDocumentWriter'
import { AcPdfDocumentWriter } from '../pdf/AcPdfDocumentWriter'
import type { AcPdfFontManager } from '../pdf/AcPdfFontManager'
import { stripMtextCodes } from '../pdf/AcPdfMarkedContent'
import type {
  AcPdfGlyphBox,
  AcPdfGlyphPrimitives,
  AcPdfGlyphProvider
} from '../text/AcPdfGlyphProvider'
import { AcPdfEntity } from './AcPdfEntity'
import { AcPdfGroup } from './AcPdfGroup'
import type { AcPdfOp, AcPdfPoint } from './AcPdfStyle'
import { AcPdfStyleContext, AcPdfStyleUtil } from './AcPdfStyleUtil'
import {
  ASCENT_RATIO,
  DESCENT_RATIO,
  layoutMText,
  OVERLINE_OFFSET_RATIO,
  STRIKE_OFFSET_RATIO,
  UNDERLINE_OFFSET_RATIO} from './AcPdfTextLayout'

const DEFAULT_POINT_RADIUS = 0.5

/**
 * AcGi backend that records vector drawables for PDF serialization.
 */
export class AcPdfRenderer implements AcGiRenderer<AcPdfEntity> {
  /**
   * Clears the shared block rendering cache before PDF export.
   *
   * The cache stores drawable objects from the last renderer that populated it
   * (typically Three.js). Reusing those entries during export causes failures
   * when block references are resolved from cache.
   */
  static prepareExport(): void {
    AcDbRenderingCache.instance.clear()
  }

  private _entities: AcPdfEntity[] = []
  private _subEntityTraits: AcGiSubEntityTraits
  private _fontMapping: AcGiFontMapping = {}
  private _ltscale = 1
  private _celtscale = 1
  private _currentBackgroundColor = 0xffffff
  private _foregroundColor = 0x000000
  private _showLineWeight = false
  private _insunits = 4
  private _title?: string
  private _paper: AcPdfExportOptions['paper']
  private _marginMm?: number
  private _pageBackground: 'none' | number = 'none'
  private _glyphProvider?: AcPdfGlyphProvider
  private _fitBox?: AcPdfExportOptions['fitBox']
  private _embedTextActualText = true
  /** `'text'` paints MTEXT/TEXT as real PDF text through `_fonts`. */
  private _textMode: 'vector' | 'text' = 'vector'
  private _fonts?: AcPdfFontManager
  private readonly _pending: Promise<void>[] = []
  /**
   * Reuses rendered glyph primitives for identical text content + style.
   *
   * ATTRIB texts render once per INSERT instance, so drawings with thousands
   * of block references carrying the same attribute values re-tessellate the
   * same glyphs over and over; each result then dominated heap use. Cached
   * entries are shared read-only and re-positioned through a per-entity
   * translation matrix (paint bakes transformed copies, so sharing is safe).
   */
  private readonly _mtextGlyphCache = new Map<string, AcPdfCachedGlyph>()
  private readonly _shapeGlyphCache = new Map<string, AcPdfCachedGlyph>()
  private readonly _mtextGlyphInflight = new Map<
    string,
    Promise<AcPdfCachedGlyph>
  >()
  private readonly _shapeGlyphInflight = new Map<
    string,
    Promise<AcPdfCachedGlyph>
  >()
  private readonly _context: AcGiContext

  constructor() {
    this._context = AcGiContext.fromBackgroundColor(
      this._currentBackgroundColor
    )
    this._subEntityTraits = {
      color: new AcCmColor(),
      lineType: {
        type: 'ByLayer',
        name: 'Continuous',
        standardFlag: 0,
        description: 'Solid line',
        totalPatternLength: 0
      },
      lineTypeScale: 1,
      lineWeight: AcGiLineWeight.ByLayer,
      fillType: {
        solidFill: true,
        patternAngle: 0,
        definitionLines: []
      },
      transparency: new AcCmTransparency(),
      thickness: 0,
      layer: '0',
      drawOrder: 0
    }
  }

  get subEntityTraits() {
    return this._subEntityTraits
  }

  get context(): AcGiContext {
    return this._context
  }

  setFontMapping(mapping: AcGiFontMapping) {
    this._fontMapping = mapping
  }

  set ltscale(scale: number) {
    this._ltscale = scale
  }

  set celtscale(scale: number) {
    this._celtscale = scale
  }

  get currentBackgroundColor(): number {
    return this._currentBackgroundColor
  }

  set currentBackgroundColor(value: number) {
    this._currentBackgroundColor = value
    this._context.backgroundIsDark = !acgiIsLightBackground(value)
    this._context.foregroundOnDark = ACGI_DARK_THEME_FOREGROUND
    this._context.foregroundOnLight = ACGI_LIGHT_THEME_FOREGROUND
  }

  changeForeground(color: number) {
    this._foregroundColor = color
  }

  get showLineWeight(): boolean {
    return this._showLineWeight
  }

  set showLineWeight(value: boolean) {
    this._showLineWeight = value
  }

  set insunits(value: number) {
    this._insunits = value
  }

  /**
   * Enables `textMode: 'text'` with the document font manager. Called by the
   * export entry point when the host provided a font resolver; text entities
   * then paint as real PDF text when an embeddable, coverage-complete font
   * is available, and fall back to vector glyphs otherwise.
   */
  set textFontManager(fonts: AcPdfFontManager) {
    this._fonts = fonts
    this._textMode = 'text'
  }

  /** Bound font manager, or `undefined` while the host provided none. */
  get textFontManager(): AcPdfFontManager | undefined {
    return this._fonts
  }

  configureExport(options: AcPdfExportOptions) {
    this._title = options.title
    this._paper = options.paper
    this._marginMm = options.marginMm
    this._pageBackground = options.background ?? 'none'
    this._glyphProvider = options.glyphProvider
    this._fitBox = options.fitBox
    this._embedTextActualText = options.embedTextActualText !== false
    this._textMode = options.textMode === 'text' ? 'text' : 'vector'
    if (options.fontMapping) {
      this.setFontMapping(options.fontMapping)
    }
    if (options.ltscale != null) {
      this.ltscale = options.ltscale
    }
    if (options.celtscale != null) {
      this.celtscale = options.celtscale
    }
    if (options.showLineWeight != null) {
      this.showLineWeight = options.showLineWeight
    }
  }

  private get styleContext(): AcPdfStyleContext {
    return {
      ltscale: this._ltscale,
      celtscale: this._celtscale,
      backgroundColor: this._currentBackgroundColor,
      foregroundColor: this._foregroundColor,
      showLineWeight: this._showLineWeight,
      insunits: this._insunits
    }
  }

  private pushEntity(entity: AcPdfEntity) {
    entity.drawOrder = this._subEntityTraits.drawOrder ?? 0
    if (!entity.layerName) {
      entity.layerName = this._subEntityTraits.layer
    }
    this._entities.push(entity)
    return entity
  }

  private removeEntities(entities: AcPdfEntity[]) {
    for (const entity of entities) {
      const index = this._entities.indexOf(entity)
      if (index >= 0) {
        this._entities.splice(index, 1)
      }
    }
  }

  group(entities: AcPdfEntity[]) {
    this.removeEntities(entities)
    return this.pushEntity(new AcPdfGroup(entities))
  }

  point(point: AcGePoint3d, style: AcGiPointStyle) {
    const entity = new AcPdfEntity()
    const r =
      style.displaySize > 0 ? style.displaySize / 2 : DEFAULT_POINT_RADIUS
    entity.addOp({
      kind: 'circle',
      x: point.x,
      y: point.y,
      r,
      style: AcPdfStyleUtil.pointStyle(this._subEntityTraits, this.styleContext)
    })
    entity.box.expandByPoint({ x: point.x - r, y: point.y - r })
    entity.box.expandByPoint({ x: point.x + r, y: point.y + r })
    return this.pushEntity(entity)
  }

  circularArc(arc: AcGeCircArc3d) {
    return this.pushStrokedPolyline(
      arc.tessellate(acdbDrawTessellateOptions(this)),
      arc.box
    )
  }

  ellipticalArc(ellipseArc: AcGeEllipseArc3d) {
    return this.pushStrokedPolyline(
      ellipseArc.tessellate(acdbDrawTessellateOptions(this)),
      ellipseArc.box
    )
  }

  lines(points: AcGePoint3dLike[]) {
    const entity = new AcPdfEntity()
    const pts = toPdfPoints(points)
    const style = AcPdfStyleUtil.strokeStyle(
      this._subEntityTraits,
      this.styleContext
    )
    this.appendStrokedPoints(entity, pts, style)
    for (const p of pts) {
      entity.box.expandByPoint(p)
    }
    return this.pushEntity(entity)
  }

  lineSegments(array: Float32Array, itemSize: number, indices: Uint16Array) {
    const entity = new AcPdfEntity()
    const style = AcPdfStyleUtil.strokeStyle(
      this._subEntityTraits,
      this.styleContext
    )
    for (let i = 0; i + 1 < indices.length; i += 2) {
      const ai = indices[i] * itemSize
      const bi = indices[i + 1] * itemSize
      const a = { x: array[ai], y: array[ai + 1] }
      const b = { x: array[bi], y: array[bi + 1] }
      entity.addOp({ kind: 'stroke', points: [a, b], style })
      entity.box.expandByPoint(a)
      entity.box.expandByPoint(b)
    }
    return this.pushEntity(entity)
  }

  area(area: AcGeArea2d) {
    const entity = new AcPdfEntity()
    const loops = area.tessellate(acdbDrawTessellateOptions(this))
    const pdfLoops: AcPdfPoint[][] = []
    for (const loop of loops) {
      if (loop.length === 0) {
        continue
      }
      const pts = toPdfPoints(loop)
      pdfLoops.push(pts)
      for (const p of pts) {
        entity.box.expandByPoint(p)
      }
    }
    const style = AcPdfStyleUtil.fillStyle(
      this._subEntityTraits,
      this.styleContext
    )
    const fillType = this._subEntityTraits.fillType
    if (pdfLoops.length > 0 && fillType.gradient) {
      const packed =
        (Math.round(style.rgb.r * 255) << 16) |
        (Math.round(style.rgb.g * 255) << 8) |
        Math.round(style.rgb.b * 255)
      const shading = shadingFromGradient(fillType.gradient, pdfLoops, packed)
      entity.addOp({
        kind: 'gradient',
        loops: pdfLoops,
        shadingType: shading.shadingType,
        coords: shading.coords,
        c0: shading.c0,
        c1: shading.c1,
        strips: shading.strips,
        style
      })
    } else if (
      pdfLoops.length > 0 &&
      !fillType.solidFill &&
      fillType.definitionLines?.length
    ) {
      const segments = tessellateHatchPattern(
        pdfLoops,
        fillType.definitionLines,
        fillType.patternAngle ?? 0
      )
      const stroke = AcPdfStyleUtil.strokeStyle(
        this._subEntityTraits,
        this.styleContext
      )
      stroke.rgb = style.rgb
      stroke.dashArray = undefined
      for (const segment of segments) {
        entity.addOp({ kind: 'stroke', points: segment, style: stroke })
      }
    } else if (pdfLoops.length > 0) {
      entity.addOp({
        kind: 'fill',
        loops: pdfLoops,
        style
      })
    }
    return this.pushEntity(entity)
  }

  mtext(mtext: AcGiMTextData, style: AcGiTextStyle, _delay?: boolean) {
    const entity = new AcPdfEntity()
    const mapped = this.resolveStyle(style)
    const fill = AcPdfStyleUtil.fillStyle(
      this._subEntityTraits,
      this.styleContext
    )
    const stroke = AcPdfStyleUtil.strokeStyle(
      this._subEntityTraits,
      this.styleContext
    )
    // Capture synchronously: the source entity may move before promises resolve.
    const position = { x: mtext.position.x, y: mtext.position.y }
    if (this._textMode === 'text' && this._fonts) {
      const fonts = this._fonts
      const fontName = mapped.font
      const contents = mtext.text ?? ''
      if (contents.trim() !== '') {
        const pending = Promise.resolve(fonts.load(fontName)).then(ok => {
          if (
            ok &&
            this.applyTextLayout(entity, mtext, fontName, fill, position)
          ) {
            return
          }
          // No embeddable program or the font misses glyphs: vector glyphs.
          this.applyVectorMtext(entity, mtext, mapped, fill, stroke, position)
        })
        this._pending.push(pending)
        return this.pushEntity(entity)
      }
    }
    this.applyVectorMtext(entity, mtext, mapped, fill, stroke, position)
    return this.pushEntity(entity)
  }

  /**
   * Lays `mtext` out as real PDF text runs (entity-local, then translated
   * to `position`). Returns `false` when a laid-out run's mapped font does
   * not cover its characters so the caller falls back to vector glyphs.
   */
  private applyTextLayout(
    entity: AcPdfEntity,
    mtext: AcGiMTextData,
    fontName: string,
    fill: ReturnType<typeof AcPdfStyleUtil.fillStyle>,
    position: { x: number; y: number }
  ): boolean {
    const fonts = this._fonts
    if (!fonts) {
      return false
    }
    // Run fonts (`\F`) map through the font-mapping table like entity fonts;
    // unloaded run fonts measure through the entity font so line math stays
    // stable (the per-run covers check below still rejects the entity then).
    const measure = (text: string, size: number, font?: string) => {
      if (font) {
        const width = fonts.widthOfText(
          this._fontMapping[font] ?? font,
          text,
          size
        )
        if (width !== undefined) {
          return width
        }
      }
      return fonts.widthOfText(fontName, text, size)
    }
    const layout = layoutMText({ data: mtext, measure })
    const joined = layout.lines.map(line => line.text).join('\n')
    if (joined.trim() === '') {
      return false
    }
    // Every run must paint: a missing or glyph-incomplete run font falls
    // back to the entity font; if that misses too, the vector path takes over.
    const fontFor = (raw: string | undefined): string => {
      const mapped = raw ? (this._fontMapping[raw] ?? raw) : fontName
      return fonts.has(mapped) ? mapped : fontName
    }
    for (const line of layout.lines) {
      for (const run of line.runs) {
        if (run.text !== '' && !fonts.covers(fontFor(run.font), run.text)) {
          return false
        }
      }
    }
    // Text plane frame. libredwg leaves MTEXT `rotation` at 0 and encodes the
    // real angle in the direction vector, so derive the baseline angle from a
    // planar direction whenever present. Up = normal × baseline flattened to
    // XY; a negative-Z extrusion (mirrored OCS) makes the projected frame
    // left-handed, rendered as mirrored glyphs through the op's `flipX`.
    const dv = mtext.directionVector
    const rotation =
      dv && Math.hypot(dv.x, dv.y) > 1e-9
        ? Math.atan2(dv.y, dv.x)
        : (mtext.rotation ?? 0)
    const rotationDeg = (rotation * 180) / Math.PI
    // `normal` is typed only in newer data-model revisions (absent from the
    // published ^1.14.6 typings, which also never populate it at runtime) —
    // read it structurally so both revisions compile; when undefined the
    // default +Z normal applies.
    const n = (mtext as { normal?: { x: number; y: number; z: number } })
      .normal
    const nz = n && (n.x !== 0 || n.y !== 0 || n.z !== 0) ? n.z : 1
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const upX = -nz * sin
    const upY = nz * cos
    const flipX = nz < 0
    const angleDeg = flipX ? rotationDeg + 180 : rotationDeg
    for (const line of layout.lines) {
      for (const run of line.runs) {
        const x = line.dx + run.dx
        const y = line.dy + run.dy
        if (run.text !== '') {
          entity.addOp({
            kind: 'text',
            text: run.text,
            hex: '',
            font: fontFor(run.font),
            size: run.size,
            x: x * cos + y * upX,
            y: x * sin + y * upY,
            angleDeg,
            hScale: run.hScale,
            tracking: run.tracking,
            obliqueDeg: run.obliqueDeg || undefined,
            flipX,
            style: run.rgb ? { ...fill, rgb: run.rgb } : fill
          })
        }
        // Stacked-fraction rules and run decorations draw as strokes in the
        // same rotated frame, colored like the run.
        const ruleStyle = {
          rgb: run.rgb ?? fill.rgb,
          opacity: fill.opacity,
          lineWidth: 0.03 * run.size
        }
        const addRule = (x0: number, y0: number, x1: number, y1: number) => {
          entity.addOp({
            kind: 'stroke',
            points: [
              { x: x0 * cos + y0 * upX, y: x0 * sin + y0 * upY },
              { x: x1 * cos + y1 * upX, y: x1 * sin + y1 * upY }
            ],
            style: ruleStyle
          })
        }
        if (run.bar) {
          addRule(
            x + run.bar.dx0,
            y + run.bar.dy,
            x + run.bar.dx1,
            y + run.bar.dy
          )
        }
        if (run.text !== '') {
          if (run.underline) {
            addRule(x, y + UNDERLINE_OFFSET_RATIO * run.size, x + run.width, y + UNDERLINE_OFFSET_RATIO * run.size)
          }
          if (run.overline) {
            addRule(x, y + OVERLINE_OFFSET_RATIO * run.size, x + run.width, y + OVERLINE_OFFSET_RATIO * run.size)
          }
          if (run.strike) {
            addRule(x, y + STRIKE_OFFSET_RATIO * run.size, x + run.width, y + STRIKE_OFFSET_RATIO * run.size)
          }
          const runAscent = run.dy + ASCENT_RATIO * run.size
          const runDescent = run.dy - DESCENT_RATIO * run.size
          const corners: AcPdfPoint[] = [
            { x, y: runDescent },
            { x: x + run.width, y: runDescent },
            { x: x + run.width, y: runAscent },
            { x, y: runAscent }
          ]
          if (run.bar) {
            const by = y + run.bar.dy
            corners.push(
              { x: x + run.bar.dx0, y: by },
              { x: x + run.bar.dx1, y: by }
            )
          }
          for (const corner of corners) {
            entity.box.expandByPoint({
              x: corner.x * cos + corner.y * upX,
              y: corner.x * sin + corner.y * upY
            })
          }
        }
      }
    }
    entity.applyMatrix(
      new AcGeMatrix3d().makeTranslation(position.x, position.y, 0)
    )
    return true
  }

  /**
   * Vector-glyph fallback: tessellated text primitives through the glyph
   * provider, deduplicated by content + style (`_mtextGlyphCache`).
   */
  private applyVectorMtext(
    entity: AcPdfEntity,
    mtext: AcGiMTextData,
    mapped: AcGiTextStyle,
    fill: ReturnType<typeof AcPdfStyleUtil.fillStyle>,
    stroke: ReturnType<typeof AcPdfStyleUtil.strokeStyle>,
    position: { x: number; y: number }
  ): void {
    const provider = this._glyphProvider
    if (!provider) {
      return
    }
    const key = mtextGlyphKey(mtext, mapped)
    const cached = this._mtextGlyphCache.get(key)
    if (cached) {
      this.applyCachedGlyphs(entity, cached, position, stroke, fill)
      if (this._embedTextActualText && cached.actualText) {
        entity.actualText = cached.actualText
      }
      return
    }
    const contents = (mtext as { contents?: string }).contents ?? ''
    const inflight = this._mtextGlyphInflight.get(key)
    if (!inflight) {
      const render = Promise.resolve(provider.renderMText(mtext, mapped)).then(
        result => {
          const entry: AcPdfCachedGlyph = {
            primitives: result.primitives,
            box: result.box,
            actualText: this._embedTextActualText
              ? result.actualText || stripMtextCodes(contents)
              : undefined
          }
          // Empty results are usually "font not ready yet"; caching them would
          // permanently suppress every later instance with the same key.
          const hasGeometry =
            entry.primitives.triangles.length >= 6 ||
            entry.primitives.polylines.length >= 2
          if (hasGeometry) {
            this._mtextGlyphCache.set(key, entry)
          }
          return entry
        }
      )
      this.trackGlyphInflight(this._mtextGlyphInflight, key, render)
      const pending = render.then(entry => {
        this.applyCachedGlyphs(entity, entry, position, stroke, fill)
        if (this._embedTextActualText && entry.actualText) {
          entity.actualText = entry.actualText
        }
      })
      this._pending.push(pending)
      return
    }
    // Identical glyph work already in flight: reuse its result instead of
    // rendering the same text again.
    const pending = inflight.then(entry => {
      this.applyCachedGlyphs(entity, entry, position, stroke, fill)
      if (this._embedTextActualText && entry.actualText) {
        entity.actualText = entry.actualText
      }
    })
    this._pending.push(pending)
  }

  shape(shape: AcGiShapeData, style?: AcGiTextStyle, _delay?: boolean) {
    const entity = new AcPdfEntity()
    const provider = this._glyphProvider
    if (!provider) {
      return this.pushEntity(entity)
    }
    const mapped = style ? this.resolveStyle(style) : style
    const fill = AcPdfStyleUtil.fillStyle(
      this._subEntityTraits,
      this.styleContext
    )
    const stroke = AcPdfStyleUtil.strokeStyle(
      this._subEntityTraits,
      this.styleContext
    )
    const position = { x: shape.position.x, y: shape.position.y }
    const key = shapeGlyphKey(shape, mapped)
    const cached = this._shapeGlyphCache.get(key)
    if (cached) {
      this.applyCachedGlyphs(entity, cached, position, stroke, fill)
      return this.pushEntity(entity)
    }
    const inflight = this._shapeGlyphInflight.get(key)
    if (!inflight) {
      const render = Promise.resolve(provider.renderShape(shape, mapped)).then(
        result => {
          const entry: AcPdfCachedGlyph = {
            primitives: result.primitives,
            box: result.box
          }
          this._shapeGlyphCache.set(key, entry)
          return entry
        }
      )
      this.trackGlyphInflight(this._shapeGlyphInflight, key, render)
    }
    const pending = (inflight ?? this._shapeGlyphInflight.get(key)!).then(
      entry => {
        this.applyCachedGlyphs(entity, entry, position, stroke, fill)
      }
    )
    this._pending.push(pending)
    return this.pushEntity(entity)
  }

  image(blob: Blob, style: AcGiImageStyle) {
    const entity = new AcPdfEntity()
    const pending = blobToImageOp(blob, style).then(op => {
      if (!op) {
        return
      }
      entity.addOp(op)
      entity.box.expandByPoint({ x: op.x, y: op.y })
      entity.box.expandByPoint({ x: op.x + op.width, y: op.y + op.height })
    })
    this._pending.push(pending)
    return this.pushEntity(entity)
  }

  /**
   * Waits for async glyph / image work scheduled by {@link mtext},
   * {@link shape}, and {@link image}.
   *
   * Paper-space viewport export must call this before cloning model-space
   * drawables; otherwise TEXT/MTEXT clones capture empty op lists.
   */
  async awaitPending(): Promise<void> {
    if (this._pending.length === 0) {
      return
    }
    const pending = this._pending.splice(0, this._pending.length)
    await Promise.all(pending)
    // Glyph callbacks may have scheduled follow-up work.
    if (this._pending.length > 0) {
      await this.awaitPending()
    }
  }

  /** Keeps one in-flight render per key; drops the entry once settled. */
  private trackGlyphInflight(
    map: Map<string, Promise<AcPdfCachedGlyph>>,
    key: string,
    promise: Promise<AcPdfCachedGlyph>
  ): void {
    map.set(key, promise)
    promise.then(
      () => {
        if (map.get(key) === promise) {
          map.delete(key)
        }
      },
      () => {
        map.delete(key)
      }
    )
  }

  /**
   * Paints a cached glyph result into `entity`, re-positioning the shared
   * text-local primitives at this instance's position via a translation
   * matrix (ops stay shared; the writer maps them with a Form XObject or a
   * numeric bake).
   */
  private applyCachedGlyphs(
    entity: AcPdfEntity,
    entry: AcPdfCachedGlyph,
    position: { x: number; y: number },
    stroke: ReturnType<typeof AcPdfStyleUtil.strokeStyle>,
    fill: ReturnType<typeof AcPdfStyleUtil.fillStyle>
  ): void {
    applyGlyphs(entity, entry.primitives, entry.box, stroke, fill)
    if (position.x !== 0 || position.y !== 0) {
      entity.applyMatrix(new AcGeMatrix3d().makeTranslation(position.x, position.y, 0))
    }
  }

  async exportAsync(roots?: AcPdfEntity[]): Promise<Uint8Array> {
    await this.awaitPending()
    // Prefer explicit roots from top-level worldDraw return values. The
    // internal `_entities` list is polluted by AcDbRenderingCache: it leaves
    // untransformed block templates in place while returning applyMatrix'd
    // clones that are never pushed here.
    const entities = roots ?? this._entities
    return AcPdfDocumentWriter.write(entities, this.writeOptions())
  }

  /**
   * Paints one layout page into an existing document.
   *
   * Multi-layout exports reuse one {@link PDFDocument} (plus a shared OCG
   * manager and image cache via `overrides`) so finished pages never have to
   * be serialized, re-parsed and copied into a merge document.
   */
  async renderToDocument(
    doc: PDFDocument,
    roots?: AcPdfEntity[],
    overrides: Partial<AcPdfWriteOptions> = {}
  ): Promise<void> {
    await this.awaitPending()
    const entities = roots ?? this._entities
    await AcPdfDocumentWriter.writePage(
      doc,
      entities,
      this.writeOptions(overrides)
    )
  }

  /**
   * Drops drawables accumulated in the renderer's internal entity list.
   *
   * Multi-page exports pass explicit roots to every page; the internal list
   * only retains block templates and stale drawables. Clearing it between
   * pages lets per-page paper-space geometry be collected while earlier
   * pages remain alive only inside the shared PDF document.
   */
  resetCollected(): void {
    this._entities.length = 0
  }

  private writeOptions(
    overrides: Partial<AcPdfWriteOptions> = {}
  ): AcPdfWriteOptions {
    return {
      insunits: this._insunits,
      background: this._pageBackground,
      title: this._title,
      paper: this._paper,
      marginMm: this._marginMm,
      fitBox: this._fitBox,
      embedTextActualText: this._embedTextActualText,
      fonts: this._fonts,
      ...overrides
    }
  }

  private appendStrokedPoints(
    entity: AcPdfEntity,
    pts: AcPdfPoint[],
    style: ReturnType<typeof AcPdfStyleUtil.strokeStyle>
  ) {
    const pattern = this._subEntityTraits.lineType.pattern
    if (isComplexLineType(pattern) && pattern) {
      const scale =
        this._ltscale *
        this._celtscale *
        this._subEntityTraits.lineTypeScale
      const walked = walkLineType(pts, pattern, scale)
      const dashless = { ...style, dashArray: undefined }
      for (const stroke of walked.strokes) {
        entity.addOp({ kind: 'stroke', points: stroke, style: dashless })
      }
      for (const placement of walked.placements) {
        this.appendComplexLineTypePlacement(entity, placement, scale, dashless)
      }
      return
    }
    if (pts.length >= 2) {
      entity.addOp({ kind: 'stroke', points: pts, style })
    }
  }

  /**
   * Injects TEXT/SHAPE glyphs for one complex-linetype placement.
   *
   * Matches {@link AcTrComplexLineBuilder}: TEXT via MiddleCenter MTEXT,
   * SHAPE via shape glyphs, with LibreDWG blank-text description fallback.
   */
  private appendComplexLineTypePlacement(
    entity: AcPdfEntity,
    placement: AcPdfLineWalkPlacement,
    lineTypeScale: number,
    dashless: ReturnType<typeof AcPdfStyleUtil.strokeStyle>
  ) {
    const provider = this._glyphProvider
    if (!provider) {
      return
    }
    const flag = placement.element.elementTypeFlag
    const size = Math.max(
      (placement.element.scale ?? 0.1) * lineTypeScale,
      1e-6
    )
    const textStyle = this.resolveComplexLineTypeTextStyle(placement)
    const fill = AcPdfStyleUtil.fillStyle(
      this._subEntityTraits,
      this.styleContext
    )

    if (isComplexTextElement(flag)) {
      const text = resolveLinetypeEmbeddedText(
        placement.element.text,
        this._subEntityTraits.lineType.description
      )
      if (text.trim().length === 0) {
        return
      }
      const mtext: AcGiMTextData = {
        text,
        height: size,
        width: 0,
        position: { x: placement.x, y: placement.y, z: 0 },
        rotation: placement.angle,
        attachmentPoint: AcGiMTextAttachmentPoint.MiddleCenter,
        widthFactor: textStyle.widthFactor || 1
      }
      const mapped = this.resolveStyle(textStyle)
      // Embedded labels are only a fraction of a unit tall. The page minimum
      // stroke is often thicker than the letter, so SHX strokes become blobs
      // that stay blocky at any zoom. Real PDF text is resolution-independent;
      // the vector fallback uses a width proportional to the text height.
      const glyphStroke = {
        ...dashless,
        lineWidth: size * 0.06,
        exactWidth: true
      }
      const pending = this.paintComplexLineTypeText(
        entity,
        mtext,
        mapped,
        fill,
        glyphStroke,
        provider
      )
      this._pending.push(pending)
      return
    }

    if (
      isComplexShapeElement(flag) ||
      placement.element.shapeNumber != null ||
      placement.element.shapeName
    ) {
      const shape: AcGiShapeData = {
        name: placement.element.shapeName,
        shapeNumber: placement.element.shapeNumber,
        size,
        position: { x: placement.x, y: placement.y, z: 0 },
        rotation: placement.angle,
        widthFactor: textStyle.widthFactor || 1
      }
      const mapped = this.resolveStyle(textStyle)
      const glyphStroke = {
        ...dashless,
        lineWidth: size * 0.06,
        exactWidth: true
      }
      const pending = Promise.resolve(
        provider.renderShape(shape, mapped)
      ).then(result => {
        const glyphNode = new AcPdfEntity()
        applyGlyphs(glyphNode, result.primitives, result.box, glyphStroke, fill)
        glyphNode.applyMatrix(
          new AcGeMatrix3d().makeTranslation(placement.x, placement.y, 0)
        )
        entity.addChild(glyphNode)
      })
      this._pending.push(pending)
    }
  }

  /**
   * Paints one linetype TEXT placement.
   *
   * Prefers real PDF text (resolution-independent). Falls back to the glyph
   * provider when the font cannot be embedded (typical for SHX).
   */
  private async paintComplexLineTypeText(
    entity: AcPdfEntity,
    mtext: AcGiMTextData,
    style: AcGiTextStyle,
    fill: ReturnType<typeof AcPdfStyleUtil.fillStyle>,
    glyphStroke: ReturnType<typeof AcPdfStyleUtil.strokeStyle>,
    provider: AcPdfGlyphProvider
  ): Promise<void> {
    const position = { x: mtext.position.x, y: mtext.position.y }
    if (this._textMode === 'text' && this._fonts) {
      const ok = await this._fonts.load(style.font)
      if (ok) {
        const textNode = new AcPdfEntity()
        if (this.applyTextLayout(textNode, mtext, style.font, fill, position)) {
          entity.addChild(textNode)
          return
        }
      }
    }
    const result = await provider.renderMText(mtext, style)
    const glyphNode = new AcPdfEntity()
    applyGlyphs(glyphNode, result.primitives, result.box, glyphStroke, fill)
    glyphNode.applyMatrix(
      new AcGeMatrix3d().makeTranslation(position.x, position.y, 0)
    )
    entity.addChild(glyphNode)
  }

  private resolveComplexLineTypeTextStyle(
    placement: AcPdfLineWalkPlacement
  ): AcGiTextStyle {
    const empty: AcGiTextStyle = {
      name: '',
      standardFlag: 0,
      fixedTextHeight: 0,
      widthFactor: 1,
      obliqueAngle: 0,
      textGenerationFlag: 0,
      lastHeight: 0,
      font: '',
      bigFont: '',
      extendedFont: ''
    }
    const database = this._context.database as AcDbDatabase | undefined
    const styleObjectId = placement.element.styleObjectId
    if (database && styleObjectId) {
      const record = database.openObjectForRead(styleObjectId) as
        | { textStyle?: AcGiTextStyle }
        | undefined
      if (record?.textStyle) {
        return { ...record.textStyle }
      }
    }

    const styleName = placement.element.style?.trim()
    if (database && styleName) {
      const record = database.tables.textStyleTable.getAt(styleName) as
        | { textStyle?: AcGiTextStyle }
        | undefined
      if (record?.textStyle) {
        return { ...record.textStyle }
      }
    }

    if (database) {
      const standard = database.tables.textStyleTable.getAt('Standard') as
        | { textStyle?: AcGiTextStyle }
        | undefined
      if (standard?.textStyle) {
        return { ...standard.textStyle }
      }
    }

    return empty
  }

  private pushStrokedPolyline(
    points: Array<{ x: number; y: number }>,
    box: { min: { x: number; y: number }; max: { x: number; y: number } }
  ) {
    const entity = new AcPdfEntity()
    const pts = toPdfPoints(points)
    this.appendStrokedPoints(
      entity,
      pts,
      AcPdfStyleUtil.strokeStyle(this._subEntityTraits, this.styleContext)
    )
    entity.box.min.set(box.min.x, box.min.y)
    entity.box.max.set(box.max.x, box.max.y)
    return this.pushEntity(entity)
  }

  private resolveStyle(style: AcGiTextStyle): AcGiTextStyle {
    const mappedFont = this._fontMapping[style.font] ?? style.font
    return mappedFont !== style.font ? { ...style, font: mappedFont } : style
  }
}

function toPdfPoints(points: Array<{ x: number; y: number }>): AcPdfPoint[] {
  return points.map(p => ({ x: p.x, y: p.y }))
}

/** Cached glyph render result shared read-only across identical texts. */
interface AcPdfCachedGlyph {
  /** Flat text-local geometry, shared by reference with every instance. */
  primitives: AcPdfGlyphPrimitives
  /** Bounding box of the text-local primitives. */
  box: AcPdfGlyphBox
  actualText?: string
}

/**
 * Cache key covering every mtext field that changes rendered geometry.
 * `position` is excluded on purpose: reuse translates shared primitives.
 * `style.lastHeight` is a scratch value that does not affect rendering.
 */
function mtextGlyphKey(mtext: AcGiMTextData, style: AcGiTextStyle): string {
  return JSON.stringify([
    mtext.text ?? '',
    mtext.height,
    mtext.width,
    mtext.rotation ?? null,
    mtext.directionVector ?? null,
    mtext.attachmentPoint ?? null,
    mtext.drawingDirection ?? null,
    mtext.lineSpaceFactor ?? null,
    mtext.widthFactor ?? null,
    glyphStyleKey(style)
  ])
}

/** Cache key covering every shape field that changes rendered geometry. */
function shapeGlyphKey(shape: AcGiShapeData, style?: AcGiTextStyle): string {
  return JSON.stringify([
    shape.name ?? null,
    shape.shapeNumber ?? null,
    shape.size,
    shape.rotation ?? null,
    shape.directionVector ?? null,
    shape.widthFactor ?? null,
    style ? glyphStyleKey(style) : null
  ])
}

function glyphStyleKey(style: AcGiTextStyle): string {
  return [
    style.name,
    style.standardFlag,
    style.fixedTextHeight,
    style.widthFactor,
    style.obliqueAngle,
    style.textGenerationFlag,
    style.font,
    style.bigFont,
    style.extendedFont ?? ''
  ].join('\u0000')
}

/**
 * Paints a rendered glyph set into `entity` as one compact op per primitive
 * kind. Geometry is text-local (relative to the text's insertion point); the
 * caller positions it via `entity.applyMatrix`.
 */
function applyGlyphs(
  entity: AcPdfEntity,
  primitives: AcPdfGlyphPrimitives,
  box: { min: { x: number; y: number }; max: { x: number; y: number } },
  strokeStyle: ReturnType<typeof AcPdfStyleUtil.strokeStyle>,
  fillStyle: ReturnType<typeof AcPdfStyleUtil.fillStyle>
) {
  if (primitives.triangles.length >= 6) {
    entity.addOp({
      kind: 'triangles',
      data: primitives.triangles,
      style: fillStyle
    })
  }
  if (primitives.polylines.length >= 2) {
    entity.addOp({
      kind: 'polylines',
      data: primitives.polylines,
      style: strokeStyle
    })
  }
  entity.box.min.set(box.min.x, box.min.y)
  entity.box.max.set(box.max.x, box.max.y)
}

async function blobToImageOp(
  blob: Blob,
  style: AcGiImageStyle
): Promise<Extract<AcPdfOp, { kind: 'image' }> | null> {
  const { boundary } = style
  if (!boundary || boundary.length < 2) {
    return null
  }
  const type = blob.type || ''
  if (type.includes('svg')) {
    return null
  }
  // pdf-lib can only embed JPEG and PNG. OLE frames deliver BMP / GIF raster
  // pictures and WMF / EMF metafiles (see AcDbOle2Frame), so convert every
  // other blob to PNG first instead of letting embedPng fail silently.
  let format: 'png' | 'jpg'
  let raster: Blob = blob
  if (type.includes('jpeg') || type.includes('jpg')) {
    format = 'jpg'
  } else if (type.includes('png')) {
    format = 'png'
  } else {
    const converted = await convertToEmbeddablePng(blob)
    if (!converted) {
      return null
    }
    raster = converted
    format = 'png'
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const pt of boundary) {
    minX = Math.min(minX, pt.x)
    minY = Math.min(minY, pt.y)
    maxX = Math.max(maxX, pt.x)
    maxY = Math.max(maxY, pt.y)
  }
  const bytes = new Uint8Array(await raster.arrayBuffer())
  return {
    kind: 'image',
    bytes,
    format,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Converts a non-embeddable image blob (BMP / GIF raster or WMF / EMF
 * metafile) to PNG. Returns `undefined` when no conversion path applies or
 * decoding fails — callers then skip the image instead of failing the export.
 */
async function convertToEmbeddablePng(blob: Blob): Promise<Blob | undefined> {
  try {
    const type = blob.type || ''
    if (type === 'image/wmf' || type === 'image/emf') {
      return await acdbRasterizeOleMetafile(blob)
    }
    return await decodeRasterBlobToPng(blob)
  } catch {
    return undefined
  }
}

/**
 * Decodes a browser-supported raster blob (BMP, GIF, WebP, …) and re-encodes
 * its first frame as PNG through a canvas.
 */
async function decodeRasterBlobToPng(blob: Blob): Promise<Blob | undefined> {
  if (typeof createImageBitmap !== 'function') {
    return undefined
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    return undefined
  }
  try {
    if (typeof OffscreenCanvas === 'function') {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return undefined
      }
      ctx.drawImage(bitmap, 0, 0)
      return await canvas.convertToBlob({ type: 'image/png' })
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return undefined
      }
      ctx.drawImage(bitmap, 0, 0)
      return await new Promise<Blob | undefined>(resolve => {
        canvas.toBlob(out => resolve(out ?? undefined), 'image/png')
      })
    }
    return undefined
  } finally {
    bitmap.close()
  }
}
