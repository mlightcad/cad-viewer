import {
  AcCmColor,
  AcCmTransparency,
  AcGeArea2d,
  AcGeBox2d,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGiFontMapping,
  AcGiImageStyle,
  AcGiLineWeight,
  AcGiMTextData,
  AcGiPointStyle,
  AcGiRenderer,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'

import { AcSvgArea } from './AcSvgArea'
import { AcSvgCircArc } from './AcSvgCircArc'
import { AcTrEllipticalArc } from './AcSvgEllipticalArc'
import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgGroup } from './AcSvgGroup'
import { AcSvgLine } from './AcSvgLine'
import { AcSvgLineSegments } from './AcSvgLineSegments'
import { AcSvgMText } from './AcSvgMText'
import { AcSvgPoint } from './AcSvgPoint'

export class AcSvgRenderer implements AcGiRenderer<AcSvgEntity> {
  private _container: Array<string>
  private _bbox: AcGeBox2d
  private _subEntityTraits: AcGiSubEntityTraits
  private _fontMapping: AcGiFontMapping

  constructor() {
    this._container = new Array<string>()
    this._bbox = new AcGeBox2d()
    this._fontMapping = {}
    this._subEntityTraits = {
      color: new AcCmColor(),
      rgbColor: 0x000000,
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
      layer: '0'
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
  setFontMapping(mapping: AcGiFontMapping) {
    this._fontMapping = mapping
  }

  /**
   * Sets global ltscale
   */
  set ltscale(_scale: number) {
    // Reserved for future linetype dash-pattern scaling
  }

  /**
   * Sets global celtscale
   */
  set celtscale(_scale: number) {
    // Reserved for future linetype dash-pattern scaling
  }

  /**
   * @inheritdoc
   */
  group(entities: AcSvgEntity[]) {
    const entity = new AcSvgGroup(entities)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   */
  point(point: AcGePoint3d, style: AcGiPointStyle) {
    const entity = new AcSvgPoint(point, style)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   */
  circularArc(arc: AcGeCircArc3d) {
    const entity = new AcSvgCircArc(arc)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   */
  ellipticalArc(ellipseArc: AcGeEllipseArc3d) {
    const entity = new AcTrEllipticalArc(ellipseArc)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   */
  lines(points: AcGePoint3dLike[]) {
    const entity = new AcSvgLine(points)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   */
  lineSegments(array: Float32Array, itemSize: number, indices: Uint16Array) {
    const entity = new AcSvgLineSegments(array, itemSize, indices)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   */
  area(area: AcGeArea2d) {
    const entity = new AcSvgArea(area)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   */
  mtext(mtext: AcGiMTextData, style: AcGiTextStyle, _delay?: boolean) {
    // Apply font mapping when available
    const mappedFont = this._fontMapping[style.font] ?? style.font
    const resolvedStyle: AcGiTextStyle = mappedFont !== style.font
      ? { ...style, font: mappedFont }
      : style
    const entity = new AcSvgMText(mtext, resolvedStyle)
    this._container.push(entity.svg)
    this._bbox.union(entity.box)
    return entity
  }

  /**
   * @inheritdoc
   * Note: image rendering is async (Blob → base64). A placeholder empty entity
   * is returned synchronously; callers that need the rendered image should use
   * `AcSvgImage.fromBlob()` directly.
   */
  image(_blob: Blob, _style: AcGiImageStyle) {
    return _tempEntity
  }

  export() {
    const elements = this._container.join('\n')
    const viewBox = this._bbox.isEmpty()
      ? {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        }
      : {
          x: this._bbox.min.x,
          y: -this._bbox.max.y,
          width: this._bbox.max.x - this._bbox.min.x,
          height: this._bbox.max.y - this._bbox.min.y
        }
    return `<?xml version="1.0"?>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
      preserveAspectRatio="xMinYMin meet"
      viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"
      width="100%" height="100%"
    >
      <g stroke="#000000" stroke-width="0.1%" fill="none" transform="matrix(1,0,0,-1,0,0)">
        ${elements}
      </g>
    </svg>`
  }
}

const _tempEntity = /*@__PURE__*/ new AcSvgEntity()
