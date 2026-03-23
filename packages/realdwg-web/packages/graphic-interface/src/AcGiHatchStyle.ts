import { AcGePoint2dLike } from '@mlightcad/geometry-engine'

export interface AcGiHatchPatternLine {
  angle: number
  base: AcGePoint2dLike
  offset: AcGePoint2dLike
  dashLengths: number[]
}

/**
 * Hatch style
 */
export interface AcGiHatchStyle {
  solidFill: boolean
  patternAngle: number
  definitionLines: AcGiHatchPatternLine[]
}
