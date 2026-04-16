import { AcSvgEntity } from './AcSvgEntity'

/**
 * SVG group entity: wraps a set of child SVG strings inside a `<g>` element.
 */
export class AcSvgGroup extends AcSvgEntity {
  constructor(entities: AcSvgEntity[]) {
    super()
    const inner = entities.map(e => e.svg).join('\n')
    this.svg = `<g>${inner}</g>`
    for (const e of entities) {
      this._box.union(e.box)
    }
  }
}
