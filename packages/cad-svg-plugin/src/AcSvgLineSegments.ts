import { AcGiSubEntityTraits } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

/**
 * SVG line-segments entity: renders pairs of vertices from an indexed
 * Float32Array as individual `<line>` elements.
 */
export class AcSvgLineSegments extends AcSvgEntity {
  constructor(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext
  ) {
    super()
    const strokeAttrs = AcSvgStyleUtil.strokeAttributes(traits, ctx)
    const lines: string[] = []

    for (let i = 0; i + 1 < indices.length; i += 2) {
      const ai = indices[i] * itemSize
      const bi = indices[i + 1] * itemSize
      const x1 = array[ai]
      const y1 = array[ai + 1]
      const x2 = array[bi]
      const y2 = array[bi + 1]
      lines.push(
        AcSvgStyleUtil.tag('line', {
          x1: String(x1),
          y1: String(y1),
          x2: String(x2),
          y2: String(y2),
          ...strokeAttrs
        })
      )
      this._box.expandByPoint({ x: x1, y: y1 })
      this._box.expandByPoint({ x: x2, y: y2 })
    }

    this.svg = lines.join('\n')
  }
}
