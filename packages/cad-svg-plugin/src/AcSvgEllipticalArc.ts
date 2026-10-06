import {
  AcGeEllipseArc3d,
  type AcGeTessellateOptions,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

export class AcTrEllipticalArc extends AcSvgEntity {
  constructor(
    ellipseArc: AcGeEllipseArc3d,
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext,
    tessellateOptions?: AcGeTessellateOptions
  ) {
    super()
    const points = ellipseArc.tessellate(tessellateOptions)
    const d = points.reduce((acc, point, i) => {
      acc += i === 0 ? 'M' : 'L'
      acc += `${point.x},${point.y}`
      return acc
    }, '')

    if (d) {
      const attrs = {
        d,
        ...AcSvgStyleUtil.strokeAttributes(traits, ctx)
      }
      this.svg = AcSvgStyleUtil.tag('path', attrs)
    }

    // Match viewBox to emitted path points rather than the theoretical ellipse AABB.
    for (const point of points) {
      this._box.expandByPoint(point)
    }
  }
}
