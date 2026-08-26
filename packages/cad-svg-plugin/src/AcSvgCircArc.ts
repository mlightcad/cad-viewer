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

    const box = arc.box
    this._box.min.copy(box.min)
    this._box.max.copy(box.max)
  }
}
