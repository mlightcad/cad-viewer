import {
  AcGeCircArc3d,
  type AcGeTessellateOptions,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

export class AcSvgCircArc extends AcSvgEntity {
  constructor(
    arc: AcGeCircArc3d,
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext,
    tessellateOptions?: AcGeTessellateOptions
  ) {
    super()
    const points = arc.tessellate(tessellateOptions)
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

    // Bound emitted tessellation, not the theoretical arc AABB (infinite
    // curves can report absurd boxes while path points stay finite).
    for (const point of points) {
      this._box.expandByPoint(point)
    }
  }
}
