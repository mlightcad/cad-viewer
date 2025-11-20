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
  AcGiRenderer,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'

import { AcSvgCircArc } from './AcSvgCircArc'
import { AcTrEllipticalArc } from './AcSvgEllipticalArc'
import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgLine } from './AcSvgLine'

export class AcSvgRenderer implements AcGiRenderer<AcSvgEntity> {
  private _container: Array<string>
  private _bbox: AcGeBox2d
  private _basePoint?: AcGePoint3d
  private _subEntityTraits: AcGiSubEntityTraits

  constructor() {
    this._container = new Array<string>()
    this._bbox = new AcGeBox2d()
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
        patternLines: []
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
  get basePoint() {
    return this._basePoint
  }
  set basePoint(value: AcGePoint3d | undefined) {
    if (value == null) {
      this._basePoint = value
    } else {
      this._basePoint = this._basePoint
        ? this._basePoint.copy(value)
        : new AcGePoint3d(value)
    }
  }

  /**
   * @inheritdoc
   */
  setFontMapping(_mapping: AcGiFontMapping) {
    // TODO: Implement it
  }

  /**
   * @inheritdoc
   */
  group(_entities: AcSvgEntity[]) {
    // TODO: Implement it
    return _tempEntity
  }

  /**
   * @inheritdoc
   */
  point(_point: AcGePoint3d) {
    // TODO: Implement it
    return _tempEntity
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
  lineSegments(_array: Float32Array, _itemSize: number, _indices: Uint16Array) {
    // TODO: Implement it
    return _tempEntity
  }

  /**
   * @inheritdoc
   */
  area(_area: AcGeArea2d) {
    // TODO: Implement it
    return _tempEntity
  }

  /**
   * @inheritdoc
   */
  mtext(_mtext: AcGiMTextData, _style: AcGiTextStyle, _delay: boolean) {
    // TODO: Implement it
    return _tempEntity
  }

  /**
   * @inheritdoc
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
