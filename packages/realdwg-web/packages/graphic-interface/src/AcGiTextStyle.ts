import { AcGePoint3dLike, AcGeVector3dLike } from '@mlightcad/geometry-engine'

export enum AcGiMTextFlowDirection {
  LEFT_TO_RIGHT = 1,
  RIGHT_TO_LEFT = 2,
  TOP_TO_BOTTOM = 3,
  BOTTOM_TO_TOP = 4,
  BY_STYLE = 5
}

export enum AcGiMTextAttachmentPoint {
  TopLeft = 1,
  TopCenter = 2,
  TopRight = 3,
  MiddleLeft = 4,
  MiddleCenter = 5,
  MiddleRight = 6,
  BottomLeft = 7,
  BottomCenter = 8,
  BottomRight = 9
}

export interface AcGiMTextData {
  text: string
  height: number
  width: number
  position: AcGePoint3dLike
  rotation?: number
  directionVector?: AcGeVector3dLike
  attachmentPoint?: AcGiMTextAttachmentPoint
  drawingDirection?: AcGiMTextFlowDirection
  lineSpaceFactor?: number
  widthFactor?: number
}

export interface AcGiTextStyle {
  name: string
  standardFlag: number
  fixedTextHeight: number
  widthFactor: number
  obliqueAngle: number
  textGenerationFlag: number
  lastHeight: number
  font: string
  bigFont: string
  extendedFont?: string
}
