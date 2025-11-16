import { AcGePoint3d } from "@mlightcad/data-model"
import { AcTrRebaser, MAX_REBASE_THRESHOLD } from "./AcTrRebaser"

export class AcTrFloatArrayRebaser implements AcTrRebaser {
  private _array: Float32Array
  private _itemSize: number

  constructor(array: Float32Array, itemSize: number) {
    this._array = array
    this._itemSize = itemSize
  }

  shouldRebase(): boolean {
    if (this._array.length < 4 ) return false
    const array = this._array
    return (
      Math.abs(array[0]) > MAX_REBASE_THRESHOLD ||
      Math.abs(array[1]) > MAX_REBASE_THRESHOLD ||
      Math.abs(array[2]) > MAX_REBASE_THRESHOLD
    )
  }

  computeOffset() {
    const array = this._array
    const offset = new AcGePoint3d()
    if (this._itemSize == 2) {
      let i = 0, len = array.length
      while (i < len) {
        offset.x += array[i]
        offset.y += array[i + 1]
        i += 2
      }
    } else if (this._itemSize == 3) {
      let i = 0, len = array.length
      while (i < len) {
        offset.x += array[i]
        offset.y += array[i + 1]
        offset.z += array[i + 2]
        i += 3
      }
    }
    return offset
  }

  rebase() {
    if (this.shouldRebase()) {
      const array = this._array
      const offset = this.computeOffset()
      const rebased = new Float32Array(array.length)
      rebased.set(array, 0)
      this.substractPoint(array, this._itemSize, offset)
      return offset
    }
    return undefined
  }

  private substractPoint(array: Float32Array, itemSize: number, basePoint: AcGePoint3d) {
    if (itemSize == 2) {
      this.subtract2dPoint(array, basePoint.x, basePoint.y)
    } else if (itemSize == 3) {
      this.subtract3dPoint(array, basePoint.x, basePoint.y, basePoint.z)
    }
  }

  private subtract3dPoint(array: Float32Array, bx: number, by: number, bz: number) {
    let i = 0, len = array.length
    while (i < len) {
      array[i]     -= bx
      array[i + 1] -= by
      array[i + 2] -= bz
      i += 3
    }
  }

  private subtract2dPoint(array: Float32Array, bx: number, by: number) {
    let i = 0, len = array.length
    while (i < len) {
      array[i]     -= bx
      array[i + 1] -= by
      i += 2
    }
  }
}