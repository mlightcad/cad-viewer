import {
  AcCmColor,
  AcCmTransparency,
  AcCmUiYieldGate,
  acdbDrawTessellateOptions,
  AcDbRenderingCache,
  AcGeArea2d,
  AcGeBox2d,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGePoint2d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGePolyline2d,
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

import { AcSvgArea } from './AcSvgArea'
import { AcSvgCircArc } from './AcSvgCircArc'
import { AcTrEllipticalArc } from './AcSvgEllipticalArc'
import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgExportUtil } from './AcSvgExportUtil'
import { computeSvgViewBox } from './AcSvgExtents'
import { AcSvgGroup } from './AcSvgGroup'
import { AcSvgImage } from './AcSvgImage'
import { AcSvgLine } from './AcSvgLine'
import { AcSvgLineSegments } from './AcSvgLineSegments'
import { AcSvgMText } from './AcSvgMText'
import { AcSvgPoint } from './AcSvgPoint'
import { AcSvgShape } from './AcSvgShape'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

/** Time budget between UI yields while serializing SVG markup. */
const SVG_SERIALIZE_YIELD_BUDGET_MS = 200

export class AcSvgRenderer implements AcGiRenderer<AcSvgEntity> {
  /**
   * Clears the shared block rendering cache before SVG/PDF export.
   *
   * The cache stores drawable objects from the last renderer that populated it
   * (typically Three.js). Reusing those entries during export causes failures
   * such as `renderSvg is not a function` when dimensions or block references
   * are resolved from cache.
   */
  static prepareExport(): void {
    AcDbRenderingCache.instance.clear()
  }

  private _entities: AcSvgEntity[]
  private _bbox: AcGeBox2d
  private _subEntityTraits: AcGiSubEntityTraits
  private _fontMapping: AcGiFontMapping
  private _ltscale = 1
  private _celtscale = 1
  private _currentBackgroundColor = 0x000000
  private _foregroundColor = 0x000000
  private _showLineWeight = false
  private _pendingImages: Promise<void>[]
  private readonly _context: AcGiContext

  constructor() {
    this._entities = []
    this._bbox = new AcGeBox2d()
    this._fontMapping = {}
    this._pendingImages = []
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

  /**
   * @inheritdoc
   */
  get subEntityTraits() {
    return this._subEntityTraits
  }

  /**
   * @inheritdoc
   */
  get context(): AcGiContext {
    return this._context
  }

  /**
   * @inheritdoc
   */
  setFontMapping(mapping: AcGiFontMapping) {
    this._fontMapping = mapping
  }

  /**
   * Sets global ltscale for linetype dash scaling.
   */
  set ltscale(scale: number) {
    this._ltscale = scale
  }

  /**
   * Sets global celtscale for linetype dash scaling.
   */
  set celtscale(scale: number) {
    this._celtscale = scale
  }

  /**
   * Canvas background colour tracked for ACI 7 resolution and SVG export.
   *
   * Mirrors {@link AcTrRenderer.currentBackgroundColor}.
   */
  get currentBackgroundColor(): number {
    return this._currentBackgroundColor
  }

  set currentBackgroundColor(value: number) {
    this._currentBackgroundColor = value
    this._context.backgroundIsDark = !acgiIsLightBackground(value)
    this._context.foregroundOnDark = ACGI_DARK_THEME_FOREGROUND
    this._context.foregroundOnLight = ACGI_LIGHT_THEME_FOREGROUND
  }

  /**
   * Foreground colour used when resolving ACI 7 linework and patterned hatches.
   * Mirrors {@link AcTrRenderer.changeForeground}.
   */
  changeForeground(color: number) {
    this._foregroundColor = color
  }

  /**
   * Whether lineweights are rendered. Mirrors the LWDISPLAY system variable.
   */
  get showLineWeight(): boolean {
    return this._showLineWeight
  }

  set showLineWeight(value: boolean) {
    this._showLineWeight = value
  }

  private get styleContext(): AcSvgStyleContext {
    return {
      ltscale: this._ltscale,
      celtscale: this._celtscale,
      backgroundColor: this._currentBackgroundColor,
      foregroundColor: this._foregroundColor,
      showLineWeight: this._showLineWeight
    }
  }

  private pushEntity(entity: AcSvgEntity) {
    this._entities.push(entity)
    return entity
  }

  private removeEntities(entities: AcSvgEntity[]) {
    for (const entity of entities) {
      const index = this._entities.indexOf(entity)
      if (index >= 0) {
        this._entities.splice(index, 1)
      }
    }
  }

  /**
   * @inheritdoc
   */
  group(entities: AcSvgEntity[]) {
    this.removeEntities(entities)
    return this.pushEntity(new AcSvgGroup(entities))
  }

  /**
   * @inheritdoc
   */
  point(point: AcGePoint3d, style: AcGiPointStyle) {
    return this.pushEntity(
      new AcSvgPoint(point, style, this._subEntityTraits, this.styleContext)
    )
  }

  /**
   * @inheritdoc
   */
  circularArc(arc: AcGeCircArc3d) {
    return this.pushEntity(
      new AcSvgCircArc(
        arc,
        this._subEntityTraits,
        this.styleContext,
        acdbDrawTessellateOptions(this)
      )
    )
  }

  /**
   * @inheritdoc
   */
  ellipticalArc(ellipseArc: AcGeEllipseArc3d) {
    return this.pushEntity(
      new AcTrEllipticalArc(
        ellipseArc,
        this._subEntityTraits,
        this.styleContext,
        acdbDrawTessellateOptions(this)
      )
    )
  }

  /**
   * @inheritdoc
   */
  lines(points: AcGePoint3dLike[]) {
    return this.pushEntity(
      new AcSvgLine(points, this._subEntityTraits, this.styleContext)
    )
  }

  /**
   * @inheritdoc
   */
  lineSegments(array: Float32Array, itemSize: number, indices: Uint16Array) {
    return this.pushEntity(
      new AcSvgLineSegments(
        array,
        itemSize,
        indices,
        this._subEntityTraits,
        this.styleContext
      )
    )
  }

  /**
   * @inheritdoc
   */
  area(area: AcGeArea2d) {
    return this.pushEntity(
      new AcSvgArea(
        area,
        this._subEntityTraits,
        this.styleContext,
        acdbDrawTessellateOptions(this)
      )
    )
  }

  /**
   * @inheritdoc
   *
   * SVG has no separate ring primitive. Rebuild the two loops as an area so
   * the fill matches the previous closed wide-polyline output.
   */
  offsetRing(outer: AcGePoint3dLike[], inner: AcGePoint3dLike[]) {
    const area = new AcGeArea2d()
    area.add(
      new AcGePolyline2d(
        outer.map(point => new AcGePoint2d(point.x, point.y)),
        true
      )
    )
    area.add(
      new AcGePolyline2d(
        inner.map(point => new AcGePoint2d(point.x, point.y)),
        true
      )
    )
    return this.area(area)
  }

  /**
   * @inheritdoc
   */
  mtext(mtext: AcGiMTextData, style: AcGiTextStyle, _delay?: boolean) {
    const mappedFont = this._fontMapping[style.font] ?? style.font
    const resolvedStyle: AcGiTextStyle =
      mappedFont !== style.font ? { ...style, font: mappedFont } : style
    return this.pushEntity(
      new AcSvgMText(
        mtext,
        resolvedStyle,
        this._subEntityTraits,
        this.styleContext
      )
    )
  }

  /**
   * @inheritdoc
   */
  shape(shape: AcGiShapeData, style: AcGiTextStyle, _delay?: boolean) {
    const mappedFont = this._fontMapping[style.font] ?? style.font
    const resolvedStyle: AcGiTextStyle =
      mappedFont !== style.font ? { ...style, font: mappedFont } : style
    return this.pushEntity(
      new AcSvgShape(
        shape,
        resolvedStyle,
        this._subEntityTraits,
        this.styleContext
      )
    )
  }

  /**
   * @inheritdoc
   */
  image(blob: Blob, style: AcGiImageStyle) {
    const traits = { ...this._subEntityTraits }
    const ctx = this.styleContext
    const pending = AcSvgImage.fromBlob(blob, style, traits, ctx).then(entity =>
      this.pushEntity(entity)
    )
    this._pendingImages.push(pending.then(() => undefined))
    return _tempEntity
  }

  /**
   * Exports SVG markup. Awaits pending raster images and yields periodically
   * so a host busy indicator can keep animating.
   *
   * Prefer explicit {@link roots} from top-level `worldDraw` return values.
   * The internal `_entities` list is polluted by {@link AcDbRenderingCache}:
   * it leaves untransformed block templates in place while returning
   * `applyMatrix`'d clones that are never pushed here.
   */
  async exportAsync(roots?: AcSvgEntity[]): Promise<string> {
    await Promise.all(this._pendingImages)
    return this.exportMarkup(true, roots)
  }

  /**
   * Synchronous export. Raster images added via {@link image} may be missing
   * unless {@link exportAsync} is used.
   *
   * @param roots - Optional top-level drawables; see {@link exportAsync}.
   */
  export(roots?: AcSvgEntity[]) {
    return this.exportMarkup(false, roots)
  }

  /**
   * Drops drawables accumulated in the internal entity list.
   */
  resetCollected(): void {
    this._entities.length = 0
  }

  private exportMarkup(cooperative: false, roots?: AcSvgEntity[]): string
  private exportMarkup(
    cooperative: true,
    roots?: AcSvgEntity[]
  ): Promise<string>
  private exportMarkup(
    cooperative: boolean,
    roots?: AcSvgEntity[]
  ): string | Promise<string> {
    if (cooperative) {
      return this.exportMarkupCooperative(roots)
    }
    return this.assembleMarkup(this.collectEntityParts(roots))
  }

  private collectEntityParts(roots?: AcSvgEntity[]): {
    parts: string[]
    boxes: AcGeBox2d[]
  } {
    const entities = roots ?? this._entities
    const parts: string[] = []
    const boxes: AcGeBox2d[] = []
    for (const entity of entities) {
      const svg = entity.renderSvg()
      if (svg) {
        parts.push(svg)
        boxes.push(entity.box)
      }
    }
    return { parts, boxes }
  }

  private async exportMarkupCooperative(
    roots?: AcSvgEntity[]
  ): Promise<string> {
    const entities = roots ?? this._entities
    const parts: string[] = []
    const boxes: AcGeBox2d[] = []
    const yieldGate = new AcCmUiYieldGate(SVG_SERIALIZE_YIELD_BUDGET_MS)
    const yieldToEventLoop = () =>
      new Promise<void>(resolve => setTimeout(resolve, 0))

    for (const entity of entities) {
      const svg = entity.renderSvg()
      if (svg) {
        parts.push(svg)
        boxes.push(entity.box)
      }
      await yieldGate.maybeYield(yieldToEventLoop)
    }

    // Let the busy spinner paint before the final join / sanitize pass.
    await yieldToEventLoop()
    return this.assembleMarkup({ parts, boxes })
  }

  private assembleMarkup(collected: {
    parts: string[]
    boxes: AcGeBox2d[]
  }): string {
    // Skip non-finite / outlier-scale entity boxes so one corrupt AABB cannot
    // inflate viewBox to ~1e149 while path coordinates stay finite (#690).
    this._bbox = computeSvgViewBox(collected.boxes)
    const elements = collected.parts.join('\n')
    const padding = this._bbox.isEmpty()
      ? 0
      : Math.max(
          this._bbox.max.x - this._bbox.min.x,
          this._bbox.max.y - this._bbox.min.y
        ) * 0.02
    const viewBox = this._bbox.isEmpty()
      ? {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        }
      : {
          x: this._bbox.min.x - padding,
          y: -(this._bbox.max.y + padding),
          width: this._bbox.max.x - this._bbox.min.x + padding * 2,
          height: this._bbox.max.y - this._bbox.min.y + padding * 2
        }
    // Use percentage size (not CAD drawing units) so browsers scale the SVG to
    // the viewport / container via viewBox, instead of treating large drawings
    // as hundreds of thousands of CSS pixels.
    const vbWidth = Math.max(viewBox.width, 1)
    const vbHeight = Math.max(viewBox.height, 1)
    const backgroundRect = this.buildBackgroundRect({
      ...viewBox,
      width: vbWidth,
      height: vbHeight
    })
    const svgMarkup = AcSvgExportUtil.sanitizeExternalReferences(
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
  preserveAspectRatio="xMinYMin meet"
  viewBox="${viewBox.x} ${viewBox.y} ${vbWidth} ${vbHeight}"
  width="100%" height="100%">
${backgroundRect}
  <g transform="matrix(1,0,0,-1,0,0)">
${elements}
  </g>
</svg>`
    )
    // Final pass: strip illegal XML chars that may appear outside escaped
    // text (e.g. leftover control bytes in attributes from CAD metadata).
    return AcSvgExportUtil.stripInvalidXmlChars(svgMarkup)
  }

  private buildBackgroundRect(viewBox: {
    x: number
    y: number
    width: number
    height: number
  }): string {
    const fill = AcSvgStyleUtil.rgbToHex(this._currentBackgroundColor)
    const width = Math.max(viewBox.width, 1)
    const height = Math.max(viewBox.height, 1)
    return `  <rect x="${viewBox.x}" y="${viewBox.y}" width="${width}" height="${height}" fill="${fill}"/>`
  }
}

const _tempEntity = /*@__PURE__*/ new AcSvgEntity()
