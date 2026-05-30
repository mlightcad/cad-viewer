import { AcGePoint3dLike, AcGiSubEntityTraits } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

export class AcSvgLine extends AcSvgEntity {
  constructor(
    points: AcGePoint3dLike[],
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext
  ) {
    super()
    const d = points.reduce(
      (acc: string, point: AcGePoint3dLike, i: number) => {
        acc += i === 0 ? 'M' : 'L'
        acc += point.x + ',' + point.y
        this.box.expandByPoint(point)
        return acc
      },
      ''
    )

    if (d) {
      const attrs = {
        d,
        ...AcSvgStyleUtil.strokeAttributes(traits, ctx)
      }
      this.svg = AcSvgStyleUtil.tag('path', attrs)
    }
  }
}
