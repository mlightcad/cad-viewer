import {
  AcCmColor,
  AcCmTransparency,
  acdbDrawTessellateOptions,
  AcDbRenderingCache,
  AcGeArea2d,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGePoint3d,
  AcGePoint3dLike,
  ACGI_DARK_THEME_FOREGROUND,
  ACGI_LIGHT_THEME_FOREGROUND,
  AcGiContext,
  AcGiFontMapping,
  AcGiImageStyle,
  acgiIsLightBackground,
  AcGiLineWeight,
  AcGiMTextData,
  AcGiPointStyle,
  AcGiRenderer,
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'

import type { AcPdfExportOptions } from '../AcPdfExportOptions'
import { shadingFromGradient } from '../hatch/AcPdfGradient'
import { tessellateHatchPattern } from '../hatch/AcPdfHatchTessellator'
import {
  isComplexLineType,
  walkLineType
} from '../linetype/AcPdfLineTypeStroker'
import { AcPdfDocumentWriter } from '../pdf/AcPdfDocumentWriter'
import { stripMtextCodes } from '../pdf/AcPdfMarkedContent'
import type { AcPdfGlyphProvider } from '../text/AcPdfGlyphProvider'
import { AcPdfEntity } from './AcPdfEntity'
import { AcPdfGroup } from './AcPdfGroup'
import type { AcPdfOp, AcPdfPoint } from './AcPdfStyle'
import { AcPdfStyleContext, AcPdfStyleUtil } from './AcPdfStyleUtil'

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
  private readonly _pending: Promise<void>[] = []
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

  configureExport(options: AcPdfExportOptions) {
    this._title = options.title
    this._paper = options.paper
    this._marginMm = options.marginMm
    this._pageBackground = options.background ?? 'none'
    this._glyphProvider = options.glyphProvider
    this._fitBox = options.fitBox
    this._embedTextActualText = options.embedTextActualText !== false
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
    const provider = this._glyphProvider
    if (!provider) {
      return this.pushEntity(entity)
    }
    const mapped = this.resolveStyle(style)
    const fill = AcPdfStyleUtil.fillStyle(
      this._subEntityTraits,
      this.styleContext
    )
    const stroke = AcPdfStyleUtil.strokeStyle(
      this._subEntityTraits,
      this.styleContext
    )
    const pending = Promise.resolve(provider.renderMText(mtext, mapped)).then(
      result => {
        applyGlyphs(entity, result.primitives, result.box, stroke, fill)
        if (this._embedTextActualText) {
          entity.actualText =
            result.actualText ||
            stripMtextCodes(
              (mtext as { contents?: string }).contents ?? ''
            )
        }
      }
    )
    this._pending.push(pending)
    return this.pushEntity(entity)
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
    const pending = Promise.resolve(provider.renderShape(shape, mapped)).then(
      result => {
        applyGlyphs(entity, result.primitives, result.box, stroke, fill)
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

  async exportAsync(roots?: AcPdfEntity[]): Promise<Uint8Array> {
    await this.awaitPending()
    // Prefer explicit roots from top-level worldDraw return values. The
    // internal `_entities` list is polluted by AcDbRenderingCache: it leaves
    // untransformed block templates in place while returning applyMatrix'd
    // clones that are never pushed here.
    const entities = roots ?? this._entities
    return AcPdfDocumentWriter.write(entities, {
      insunits: this._insunits,
      background: this._pageBackground,
      title: this._title,
      paper: this._paper,
      marginMm: this._marginMm,
      fitBox: this._fitBox,
      embedTextActualText: this._embedTextActualText
    })
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
      for (const shape of walked.shapes) {
        const ds = Math.max(style.lineWidth, 0.5) * 2
        entity.addOp({
          kind: 'stroke',
          points: [
            { x: shape.x, y: shape.y },
            {
              x: shape.x + Math.cos(shape.angle) * ds,
              y: shape.y + Math.sin(shape.angle) * ds
            }
          ],
          style: dashless
        })
        if (this._glyphProvider && (shape.element.shapeName || shape.element.text)) {
          const pending = Promise.resolve(
            this._glyphProvider.renderShape(
              {
                position: { x: shape.x, y: shape.y, z: 0 },
                size: shape.element.scale ?? ds,
                rotation: shape.angle,
                name: shape.element.shapeName,
                shapeNumber: shape.element.shapeNumber,
                widthFactor: 1,
                obliqingAngle: 0
              } as AcGiShapeData,
              undefined
            )
          ).then(result => {
            applyGlyphs(entity, result.primitives, result.box, dashless, {
              rgb: dashless.rgb,
              opacity: dashless.opacity
            })
          })
          this._pending.push(pending)
        }
      }
      return
    }
    if (pts.length >= 2) {
      entity.addOp({ kind: 'stroke', points: pts, style })
    }
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

function applyGlyphs(
  entity: AcPdfEntity,
  primitives: Array<{
    kind: 'stroke' | 'fill'
    points: Array<{ x: number; y: number }>
  }>,
  box: { min: { x: number; y: number }; max: { x: number; y: number } },
  strokeStyle: ReturnType<typeof AcPdfStyleUtil.strokeStyle>,
  fillStyle: ReturnType<typeof AcPdfStyleUtil.fillStyle>
) {
  for (const primitive of primitives) {
    if (primitive.kind === 'stroke') {
      entity.addOp({
        kind: 'stroke',
        points: primitive.points,
        style: strokeStyle
      })
    } else if (primitive.points.length >= 3) {
      entity.addOp({
        kind: 'fill',
        loops: [primitive.points],
        style: fillStyle
      })
    }
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
  const format: 'png' | 'jpg' = type.includes('jpeg') || type.includes('jpg')
    ? 'jpg'
    : 'png'
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
  const bytes = new Uint8Array(await blob.arrayBuffer())
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
