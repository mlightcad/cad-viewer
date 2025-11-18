import {
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcTrRebaser, MAX_REBASE_THRESHOLD } from './AcTrRebaser'

export class AcTrPointRebaser implements AcTrRebaser {
  private _point: AcGePoint3dLike | AcGePoint2dLike

  constructor(point: AcGePoint3dLike | AcGePoint2dLike) {
    this._point = point
  }

  shouldRebase(): boolean {
    const point = this._point as AcGePoint3dLike
    return (
      Math.abs(point.x) > MAX_REBASE_THRESHOLD ||
      Math.abs(point.y) > MAX_REBASE_THRESHOLD ||
      (point.z != null && Math.abs(point.z) > MAX_REBASE_THRESHOLD)
    )
  }

  computeOffset() {
    return new AcGePoint3d().copy(this._point)
  }

  rebase(basePoint?: AcGePoint3d) {
    if (basePoint || this.shouldRebase()) {
      const point = this._point as AcGePoint3dLike
      const offset = basePoint ?? this.computeOffset()
      point.x -= offset.x
      point.y -= offset.y
      if (point.z != null) {
        point.z -= offset.z
      }
      return offset
    }
    return undefined
  }
}
