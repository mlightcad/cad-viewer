import { AcSvgEntity } from './AcSvgEntity'

/**
 * SVG group entity: wraps child SVG markup inside a `<g>` element.
 */
export class AcSvgGroup extends AcSvgEntity {
  private readonly _childCount: number

  constructor(entities: AcSvgEntity[]) {
    super()
    this._childCount = entities.length
    const inner = entities
      .map(e => e.renderSvg())
      .filter(Boolean)
      .join('\n')
    this._localSvg = inner
    for (const e of entities) {
      this._box.union(e.box)
    }
  }

  /**
   * Number of entities passed to this group at construction.
   *
   * Satisfies {@link AcGiEntity.childCount} for cache heuristics (SVG groups
   * bake children into markup and do not keep a live child list).
   */
  get childCount() {
    return this._childCount
  }
}
