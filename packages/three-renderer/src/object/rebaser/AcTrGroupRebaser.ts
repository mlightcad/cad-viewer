import { AcGePoint3d } from '@mlightcad/data-model'

import { AcTrEntity } from '../AcTrEntity'
import { AcTrRebaser, MAX_REBASE_THRESHOLD } from './AcTrRebaser'

export class AcTrGroupRebaser implements AcTrRebaser {
  private _entities: AcTrEntity[]

  constructor(entities: AcTrEntity[]) {
    this._entities = entities
  }

  shouldRebase(): boolean {
    if (this._entities.length == 0) return false
    const point = this._entities[0].position
    return (
      Math.abs(point.x) > MAX_REBASE_THRESHOLD ||
      Math.abs(point.y) > MAX_REBASE_THRESHOLD ||
      (point.z != null && Math.abs(point.z) > MAX_REBASE_THRESHOLD)
    )
  }

  computeOffset() {
    const offset = new AcGePoint3d()
    const entities = this._entities
    let count = 0
    entities.forEach(entity => {
      const point = entity.basePoint
      if (point) {
        offset.x += point.x
        offset.y += point.y
        offset.z += point.z
        count++
      }
    })
    if (count > 0) offset.divideScalar(count)
    return offset
  }

  rebase(basePoint?: AcGePoint3d) {
    if (basePoint || this.shouldRebase()) {
      const entities = this._entities
      const offset = basePoint ?? this.computeOffset()
      for (let i = 0; i < entities.length; i++) {
        if (entities[i].basePoint == null) {
          entities[i].basePoint = new AcGePoint3d()
        }
        entities[i].basePoint?.sub(offset)
      }
      return offset
    }
    return undefined
  }
}
