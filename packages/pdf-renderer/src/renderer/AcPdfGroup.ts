import { AcPdfEntity } from './AcPdfEntity'

/**
 * Group of PDF drawables. Children stay live so INSERT clones and ATTRIB
 * `addChild` keep working.
 */
export class AcPdfGroup extends AcPdfEntity {
  constructor(entities: AcPdfEntity[]) {
    super()
    let minOrder = 0
    let hasOrder = false
    for (const entity of entities) {
      this.addChild(entity)
      if (!hasOrder) {
        minOrder = entity.drawOrder
        hasOrder = true
      } else {
        minOrder = Math.min(minOrder, entity.drawOrder)
      }
    }
    this.drawOrder = minOrder
  }
}
