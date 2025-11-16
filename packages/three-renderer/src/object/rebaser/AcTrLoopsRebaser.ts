import { AcGePoint2dLike, AcGePoint3d } from "@mlightcad/data-model"
import { AcTrRebaser, MAX_REBASE_THRESHOLD } from "./AcTrRebaser"

export class AcTrLoopsRebaser implements AcTrRebaser {
  private _loops: AcGePoint2dLike[][]

  constructor(loops: AcGePoint2dLike[][]) {
    this._loops = loops
  }

  shouldRebase(): boolean {
    const loops = this._loops
    if (loops.length == 0 || loops[0].length == 0) return false
    const point = loops[0][0]
    return (
      Math.abs(point.x) > MAX_REBASE_THRESHOLD ||
      Math.abs(point.y) > MAX_REBASE_THRESHOLD
    )
  }

  computeOffset() {
    const offset = new AcGePoint3d()
    const loops = this._loops
    let count = 0
    for (let i = 0; i < loops.length; ++i) {
      const loop = loops[i]
      count += loop.length
      for (let j = 0; j < loop.length; ++j) {
        const point = loop[j]
        offset.x += point.x
        offset.y += point.y
      }
    }
    offset.divideScalar(count)
    return offset
  }

  rebase() {
    if (this.shouldRebase()) {
      const loops = this._loops
      const offset = this.computeOffset()
      for (let i = 0; i < loops.length; ++i) {
        const loop = loops[i]
        for (let j = 0; j < loop.length; ++j) {
          const point = loop[j]
          point.x -= offset.x
          point.y -= offset.y
        }
      }
      return offset
    }
    return undefined
  }
}