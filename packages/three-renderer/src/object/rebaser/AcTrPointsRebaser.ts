import { AcGePoint2dLike, AcGePoint3d, AcGePoint3dLike } from "@mlightcad/data-model"
import { AcTrRebaser, MAX_REBASE_THRESHOLD } from "./AcTrRebaser"

export class AcTrPointsRebaser implements AcTrRebaser {
  private _points: AcGePoint3dLike[] | AcGePoint2dLike[]

  constructor(points: AcGePoint3dLike[] | AcGePoint2dLike[]) {
    this._points = points
  }

  shouldRebase(): boolean {
    if (this._points.length == 0) return false
    const point = this._points[0] as AcGePoint3dLike
    return (
      Math.abs(point.x) > MAX_REBASE_THRESHOLD ||
      Math.abs(point.y) > MAX_REBASE_THRESHOLD ||
      (point.z != null && Math.abs(point.z) > MAX_REBASE_THRESHOLD)
    )
  }

  computeOffset() {
    const offset = new AcGePoint3d()
    const positions = this._points
    const isVector3 = (positions[0] as AcGePoint3dLike).z != null
    positions.forEach((point) => {
      if (!isVector3) {
        offset.x += point.x
        offset.y += point.y
      } else {
        offset.add(point)
      }
    })
    offset.divideScalar(positions.length)
    return offset
  }

  rebase() {
    if (this.shouldRebase()) {
      const positions = this._points
      const isVector3 = (positions[0] as AcGePoint3dLike).z != null
      const offset = this.computeOffset()
      for (let i = 0; i < positions.length; i++) {
        positions[i].x -= offset.x
        positions[i].y -= offset.y
        if (isVector3) {
          (positions[i] as AcGePoint3dLike).z -= offset.z
        }
      }
      return offset
    }
    return undefined
  }
}