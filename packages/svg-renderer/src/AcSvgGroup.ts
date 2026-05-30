import { AcSvgEntity } from './AcSvgEntity'

/**
 * SVG group entity: wraps child SVG markup inside a `<g>` element.
 */
export class AcSvgGroup extends AcSvgEntity {
  constructor(entities: AcSvgEntity[]) {
    super()
    const inner = entities
      .map(e => e.renderSvg())
      .filter(Boolean)
      .join('\n')
    this._localSvg = inner
    for (const e of entities) {
      this._box.union(e.box)
    }
  }
}
