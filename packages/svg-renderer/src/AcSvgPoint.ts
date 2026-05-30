import {
  AcGePoint3d,
  AcGiPointStyle,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

/** Default point radius in drawing units when displaySize is 0 or not set. */
const DEFAULT_POINT_RADIUS = 0.5

/**
 * SVG point entity: renders as a small filled circle.
 */
export class AcSvgPoint extends AcSvgEntity {
  constructor(
    point: AcGePoint3d,
    style: AcGiPointStyle,
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext
  ) {
    super()
    const r =
      style.displaySize > 0 ? style.displaySize / 2 : DEFAULT_POINT_RADIUS
    const attrs = {
      cx: String(point.x),
      cy: String(point.y),
      r: String(r),
      ...AcSvgStyleUtil.pointAttributes(traits, ctx)
    }
    this.svg = AcSvgStyleUtil.tag('circle', attrs)
    this._box.expandByPoint(point)
  }
}
