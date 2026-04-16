import { AcGeArea2d } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'

/** Segments per arc when approximating curves in area loops. */
const ARC_SEGMENTS = 32

/**
 * SVG area entity: renders an `AcGeArea2d` as a filled `<path>` element.
 * Uses even-odd fill rule so inner loops (holes) render as transparent cutouts.
 */
export class AcSvgArea extends AcSvgEntity {
  constructor(area: AcGeArea2d) {
    super()
    const loopPointArrays = area.getPoints(ARC_SEGMENTS)
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

    this.svg = `<path d="${d}" fill-rule="evenodd"/>`
  }
}
