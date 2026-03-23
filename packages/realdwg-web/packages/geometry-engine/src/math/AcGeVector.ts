import { AcGeVector2d } from './AcGeVector2d'
import { AcGeVector3d } from './AcGeVector3d'

export type AcGeVector = AcGeVector2d | AcGeVector3d
export type AcGeVectorLike = {
  x: number
  y: number
  z?: number
}
