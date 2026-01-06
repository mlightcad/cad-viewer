import { AcDbObjectId } from '@mlightcad/data-model'

/**
 * Item returned by spatial query
 */
export interface AcEdSpatialQueryResultItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  id: AcDbObjectId
}

export interface AcEdSpatialQueryResultItemEx
  extends AcEdSpatialQueryResultItem {
  children?: AcEdSpatialQueryResultItem[]
}
