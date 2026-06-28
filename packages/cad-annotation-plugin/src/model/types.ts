import { AcGiLineWeight } from '@mlightcad/data-model'

/** Graphic or media annotation tool type. */
export type AnnotationType =
  | 'text'
  | 'leader'
  | 'arrow'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'cloud'
  | 'freehand'
  | 'image'
  | 'video'
  | 'audio'

/** Content carrier for an annotation. */
export type CarrierType = 'text' | 'image' | 'video' | 'audio'

export interface Point2d {
  x: number
  y: number
}

export interface Box2d {
  min: Point2d
  max: Point2d
}

export interface AnnotationStyle {
  textColor: string
  fillColor: string
  lineColor: string
  lineWeight: AcGiLineWeight
}

export interface AnnotationMeta {
  createdBy?: string
  createdAt: string
  updatedAt: string
  keywords: string[]
}

export interface AnnotationContent {
  text?: string
  mediaMimeType?: string
  mediaData?: string
  mediaDuration?: number
}

export interface LineGeometry {
  p1: Point2d
  p2: Point2d
}

export interface BoxGeometry {
  box: Box2d
}

export interface PointsGeometry {
  points: Point2d[]
}

export interface EllipseGeometry {
  center: Point2d
  majorAxis: Point2d
  ratio: number
}

export interface LeaderGeometry {
  anchor: Point2d
  elbow?: Point2d
  textPoint: Point2d
  text: string
}

export interface AnchorGeometry {
  anchor: Point2d
  width?: number
  height?: number
}

export type AnnotationGeometry =
  | LineGeometry
  | BoxGeometry
  | PointsGeometry
  | EllipseGeometry
  | LeaderGeometry
  | AnchorGeometry

export interface AnnotationRecord {
  id: string
  type: AnnotationType
  carrier: CarrierType
  layoutSpaceId: string
  geometry: AnnotationGeometry
  style: AnnotationStyle
  content?: AnnotationContent
  meta: AnnotationMeta
  visible: boolean
}

export interface Bookmark {
  id: string
  name: string
  layoutSpaceId: string
  center: Point2d
  scale: number
}

export interface AnnotationDocumentSnapshot {
  drawingId: string
  bookmarks: Bookmark[]
  annotations: AnnotationRecord[]
}

export const ANNOTATION_JSON_VERSION = 1

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = {
  textColor: '#ff0000',
  fillColor: 'transparent',
  lineColor: '#ff0000',
  lineWeight: AcGiLineWeight.LineWeight100
}