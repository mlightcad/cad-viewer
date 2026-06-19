import {
  AcCmColor,
  AcCmTransparency,
  AcDbRenderingCache,
  AcGeArea2d,
  AcGeBox2d,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGiContext,
  AcGiFontMapping,
  AcGiImageStyle,
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
import { AcSvgGroup } from './AcSvgGroup'
import { AcSvgImage } from './AcSvgImage'
import { AcSvgLine } from './AcSvgLine'
import { AcSvgLineSegments } from './AcSvgLineSegments'
import { AcSvgMText } from './AcSvgMText'
import { AcSvgPoint } from './AcSvgPoint'
import { AcSvgShape } from './AcSvgShape'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

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

  constructor() {
    this._entities = []
    this._bbox = new AcGeBox2d()
    this._fontMapping = {}
    this._pendingImages = []
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
    return AcGiContext.fromBackgroundColor(this._currentBackgroundColor)
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
      new AcSvgCircArc(arc, this._subEntityTraits, this.styleContext)
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
        this.styleContext
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
      new AcSvgArea(area, this._subEntityTraits, this.styleContext)
    )
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
   * Exports accumulated SVG markup. Awaits any pending raster images first.
   */
  async exportAsync(): Promise<string> {
    await Promise.all(this._pendingImages)
    return this.export()
  }

  /**
   * Synchronous export. Raster images added via {@link image} may be missing
   * unless {@link exportAsync} is used.
   */
  export() {
    const parts: string[] = []
    const bbox = new AcGeBox2d()
    for (const entity of this._entities) {
      const svg = entity.renderSvg()
      if (svg) {
        parts.push(svg)
        bbox.union(entity.box)
      }
    }
    this._bbox = bbox
    const elements = parts.join('\n')
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
    const width = Math.max(viewBox.width, 1)
    const height = Math.max(viewBox.height, 1)
    const backgroundRect = this.buildBackgroundRect(viewBox)
    const svgMarkup = AcSvgExportUtil.sanitizeExternalReferences(
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
  preserveAspectRatio="xMinYMin meet"
  viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"
  width="${width}" height="${height}">
${backgroundRect}
  <g transform="matrix(1,0,0,-1,0,0)">
${elements}
  </g>
</svg>`
    )
    return svgMarkup
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
