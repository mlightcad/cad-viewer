import type {
  AcDbDatabase,
  AcDbEntity,
  AcDbObjectId,
  AcGeMatrix3d
} from '@mlightcad/data-model'

/**
 * One native entity occurrence for read-only inspection and object snapping.
 * It is deliberately not an editable selection-set ID: separate drawings and
 * repeated INSERTs may share the same entity handle.
 */
export interface AcEdDrawingPickResult {
  /** Absent for the editable host; otherwise the committed overlay ID. */
  readonly referenceId?: string
  /** Host model-space occurrence seen through a paper-space viewport. */
  readonly viewportId?: AcDbObjectId
  /** Paper viewport clipping in displayed WCS; absent for ordinary drawings. */
  readonly clipBounds?: {
    readonly minX: number
    readonly minY: number
    readonly maxX: number
    readonly maxY: number
  }
  readonly database: AcDbDatabase
  /** Model/paper-space entity containing this occurrence. */
  readonly rootId: AcDbObjectId
  /** Nested INSERT handles followed by the leaf handle, below rootId. */
  readonly path: readonly AcDbObjectId[]
  /** Render occurrence ancestry, including anonymous MINSERT row/column cells. */
  readonly instancePath: readonly number[]
  readonly entity: AcDbEntity
  /** Entity-local coordinates to the displayed host WCS; owned snapshot. */
  readonly transform: AcGeMatrix3d
  /** Display-space bounds used for ordering and intersection pruning. */
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
  /** False once the source, occurrence, placement or visibility changes. */
  isCurrent(): boolean
}
