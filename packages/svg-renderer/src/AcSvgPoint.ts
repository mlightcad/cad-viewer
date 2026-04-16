import { AcGePoint3d, AcGiPointStyle } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'

/** Default point radius in drawing units when displaySize is 0 or not set. */
const DEFAULT_POINT_RADIUS = 0.5

/**
 * SVG point entity: renders as a small filled circle.
 * Honours `AcGiPointStyle.displaySize` when positive (absolute units).
 */
export class AcSvgPoint extends AcSvgEntity {
  constructor(point: AcGePoint3d, style: AcGiPointStyle) {
    super()
    const r =
      style.displaySize > 0 ? style.displaySize / 2 : DEFAULT_POINT_RADIUS
    this.svg = `<circle cx="${point.x}" cy="${point.y}" r="${r}" fill="currentColor" stroke="none"/>`
    this._box.expandByPoint(point)
  }
}
