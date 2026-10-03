import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbEntity,
  AcDbObjectId,
  AcDbOsnapMode,
  AcGeBox2d,
  AcGeMatrix3d
} from '@mlightcad/data-model'
import type { AcTrViewportView } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { acEdDrawingOsnapPoints } from '../editor/view/AcEdDrawingGeometry'
import type { AcEdDrawingPickResult } from '../editor/view/AcEdDrawingPickResult'
import { isEffectiveSpatialQueryHit } from '../editor/view/AcEdSpatialQueryResult'
import type { AcTrLayout } from './AcTrLayout'

/** A currently published native drawing in one document view. */
export interface AcTrDrawingPickSource {
  readonly referenceId?: string
  readonly database: AcDbDatabase
  readonly layout: AcTrLayout
  /** Native model view projected into paper space; absent in ordinary views. */
  readonly viewport?: AcTrViewportView
  /** Registry/session ownership, independent of geometric visibility. */
  isCurrent(): boolean
}

/** Projects a source-WCS rectangle through a plan-view placement. */
function transformBounds(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  matrix: THREE.Matrix4
) {
  const bounds = new THREE.Box3()
  for (const x of [box.minX, box.maxX]) {
    for (const y of [box.minY, box.maxY]) {
      bounds.expandByPoint(new THREE.Vector3(x, y, 0).applyMatrix4(matrix))
    }
  }
  return {
    minX: bounds.min.x,
    minY: bounds.min.y,
    maxX: bounds.max.x,
    maxY: bounds.max.y
  }
}

/**
 * Queries the existing source-WCS index with an inverse-placed aperture, then
 * ray-tests native rendered geometry. Source entities are never transformed or
 * inserted into the host database. No drawing-wide scan runs during picking.
 */
export function acTrPickDrawingEntities(
  source: AcTrDrawingPickSource,
  aperture: AcGeBox2d,
  raycaster: THREE.Raycaster
): AcEdDrawingPickResult[] {
  const { database, layout } = source
  if (!source.isCurrent() || (!source.viewport && !layout.visible)) return []
  const root = layout.internalObject
  root.updateWorldMatrix(true, false)
  const nativePlacement = root.matrixWorld.clone()
  const projection = source.viewport?.modelToPaperTransform
  const clip = source.viewport?.viewport.box.clone()
  const placement = projection
    ? new THREE.Matrix4()
        .fromArray(projection.elements)
        .multiply(nativePlacement)
    : nativePlacement
  if (
    !placement.elements.every(Number.isFinite) ||
    placement.determinant() === 0
  )
    return []
  const local = transformBounds(
    {
      minX: aperture.min.x,
      minY: aperture.min.y,
      maxX: aperture.max.x,
      maxY: aperture.max.y
    },
    placement.clone().invert()
  )
  const query = new AcGeBox2d().setFromPoints([
    { x: local.minX, y: local.minY },
    { x: local.maxX, y: local.maxY }
  ])
  const revision = database.renderingRevision
  const sourceIsCurrent = () => {
    if (
      !source.isCurrent() ||
      (!source.viewport && !layout.visible) ||
      database.renderingRevision !== revision
    )
      return false
    root.updateWorldMatrix(true, false)
    const currentClip = source.viewport?.viewport.box
    return (
      root.matrixWorld.equals(nativePlacement) &&
      (!projection ||
        projection.equals(source.viewport!.modelToPaperTransform)) &&
      (!clip ||
        (currentClip !== undefined &&
          clip.min.equals(currentClip.min) &&
          clip.max.equals(currentClip.max)))
    )
  }
  const results: AcEdDrawingPickResult[] = []
  for (const item of layout.search(query)) {
    if (!isEffectiveSpatialQueryHit(item)) continue
    if (
      !layout.hasVisibleEntity(item.id) ||
      layout.getEntityVisible(item.id) === false
    )
      continue
    if (!layout.isIntersectWith(item.id, raycaster)) continue
    const top = database.getObjectById(item.id)
    if (!(top instanceof AcDbEntity)) continue
    // Keep the containing INSERT for its native insertion snap; leaves carry
    // the precise occurrence identity for every other geometry mode.
    const children =
      top instanceof AcDbBlockReference
        ? [item, ...(item.children ?? [])]
        : [item]
    for (const child of children) {
      const occurrence = child.occurrence
      // A hierarchical child must identify its actual occurrence. A bare
      // gsMark cannot distinguish repeated INSERTs and must not be guessed.
      if (child !== item && top instanceof AcDbBlockReference && !occurrence)
        continue
      const entity = occurrence
        ? database.getObjectById(occurrence.entityId)
        : top
      if (!(entity instanceof AcDbEntity)) continue
      const path = occurrence
        ? [...occurrence.insertPath, occurrence.entityId]
        : []
      const ancestors: AcDbEntity[] = [top]
      let complete = true
      for (const id of path) {
        const member = database.getObjectById(id)
        if (!(member instanceof AcDbEntity)) {
          complete = false
          break
        }
        ancestors.push(member)
      }
      if (!complete) continue
      const visible = () => occurrenceVisible(layout, ancestors, item.id)
      if (!visible()) continue
      const transform = placement.clone()
      if (occurrence) transform.multiply(occurrence.entityToSource)
      const bounds = transformBounds(child, placement)
      if (
        bounds.maxX < aperture.min.x ||
        bounds.minX > aperture.max.x ||
        bounds.maxY < aperture.min.y ||
        bounds.minY > aperture.max.y
      )
        continue
      const candidate: AcEdDrawingPickResult = {
        referenceId: source.referenceId,
        viewportId: source.viewport?.viewport.id,
        clipBounds: clip
          ? {
              minX: clip.min.x,
              minY: clip.min.y,
              maxX: clip.max.x,
              maxY: clip.max.y
            }
          : undefined,
        database,
        rootId: item.id,
        path,
        instancePath: occurrence ? [...occurrence.instancePath] : [],
        entity,
        transform: new AcGeMatrix3d().fromArray(transform.elements),
        ...bounds,
        isCurrent: () => sourceIsCurrent() && visible()
      }
      // An aggregate block ray hit must not identify another child whose large
      // bounds merely surround the cursor. Reuse native nearest-point geometry
      // where supported; text/fills keep their renderer's area-pick policy.
      if (occurrence) {
        const cursor = {
          x: (aperture.min.x + aperture.max.x) / 2,
          y: (aperture.min.y + aperture.max.y) / 2,
          z: 0
        }
        const nearest = acEdDrawingOsnapPoints(
          candidate,
          AcDbOsnapMode.Nearest,
          cursor
        )
        if (
          nearest.length > 0 &&
          !nearest.some(point => aperture.containsPoint(point))
        )
          continue
      }
      results.push(candidate)
    }
  }
  return results
}

/** Effective layer-0 inheritance follows the captured INSERT ancestry. */
function occurrenceVisible(
  layout: AcTrLayout,
  ancestors: readonly AcDbEntity[],
  rootId: AcDbObjectId
): boolean {
  if (
    !layout.hasVisibleEntity(rootId) ||
    layout.getEntityVisible(rootId) === false
  )
    return false
  let inheritedLayer = '0'
  for (const [index, entity] of ancestors.entries()) {
    if (entity.visibility === false) return false
    const name = entity.layer === '0' ? inheritedLayer : entity.layer
    const layer = layout.getLayer(name)
    // A frozen INSERT hides its subtree. An off INSERT layer only hides
    // inherited layer-0 geometry; explicit child layers keep their own state.
    if (layer?.isFrozen) return false
    if (
      index === ancestors.length - 1 &&
      (layer?.isOff || layout.getLayer(name)?.visible === false)
    )
      return false
    inheritedLayer = name
  }
  return true
}
