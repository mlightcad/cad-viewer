import type { AcDbObjectId } from '@mlightcad/data-model'
import type * as THREE from 'three'

/**
 * One native entity occurrence below an indexed drawing root.
 *
 * The root's handle is supplied by the index. `insertPath` contains the nested
 * native group/INSERT handles between that root and `entityId`. `instancePath`
 * is the group-child ancestry, which also distinguishes anonymous MINSERT
 * cells sharing every native handle. Both paths survive template compaction.
 *
 * `entityToSource` maps the database entity's own WCS coordinates into the
 * source drawing WCS, including INSERT and attribute placement. It excludes
 * renderer geometry-origin offsets and external reference placement. Treat
 * all fields, including the matrix, as immutable snapshots.
 */
export interface AcTrEntityOccurrence {
  readonly entityId: AcDbObjectId
  readonly insertPath: readonly AcDbObjectId[]
  readonly instancePath: readonly number[]
  readonly entityToSource: THREE.Matrix4
}
