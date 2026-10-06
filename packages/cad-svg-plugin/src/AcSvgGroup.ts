import { AcSvgEntity } from './AcSvgEntity'

/**
 * SVG group entity: keeps live children so INSERT clones and ATTRIB
 * {@link AcSvgEntity.addChild} keep working (same model as PDF export).
 */
export class AcSvgGroup extends AcSvgEntity {
  constructor(entities: AcSvgEntity[]) {
    super()
    for (const entity of entities) {
      this.addChild(entity)
    }
  }
}
