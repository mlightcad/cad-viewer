import {
  AcGeArea2d,
  AcGiSubEntityTraits,
  type AcGeTessellateOptions
} from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

/**
 * SVG area entity: renders an `AcGeArea2d` as a filled `<path>` element.
 * Uses even-odd fill rule so inner loops (holes) render as transparent cutouts.
 */
export class AcSvgArea extends AcSvgEntity {
  constructor(
    area: AcGeArea2d,
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext,
    tessellateOptions?: AcGeTessellateOptions
  ) {
    super()
    const loopPointArrays = area.tessellate(tessellateOptions)
    let d = ''

    for (const loop of loopPointArrays) {
      if (loop.length === 0) continue
      const [first, ...rest] = loop
      d += `M${first.x},${first.y}`
      for (const pt of rest) {
        d += ` L${pt.x},${pt.y}`
      }
      d += ' Z'
      for (const pt of loop) {
        this._box.expandByPoint(pt)
      }
    }

    if (d) {
      const attrs = {
        d,
        'fill-rule': 'evenodd',
        ...AcSvgStyleUtil.fillAttributes(traits, ctx)
      }
      this.svg = AcSvgStyleUtil.tag('path', attrs)
    }
  }
}
