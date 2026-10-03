import {
  AcTrEntity,
  AcTrGroup,
  acTrResolveAncestorLayerNames
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import type { AcEdSpatialQueryResultItem } from '../editor/view/AcEdSpatialQueryResult'
import {
  assertAcTrGroupWcsBboxesConsistent,
  unionGroupWcsChildBoxes
} from './AcTrGroupWcsBboxAssert'
import type { AcTrInheritedLayerMaterialMapper } from './AcTrInheritedLayerMaterialMapper'

/** Host scene and detached reference layouts share the native registration path. */
export interface AcTrGroupRegistrationSink {
  addEntity(entity: AcTrEntity): void
}

/**
 * Registers a finished native group in its effective CAD layers. Consumes the
 * group and temporary wrappers; the sink retains the copied batch geometry.
 * Font work, cancellation and host session state belong to the calling owner.
 */
export function acTrRegisterGroup(
  group: AcTrGroup,
  mapper: AcTrInheritedLayerMaterialMapper,
  sink: AcTrGroupRegistrationSink
): void {
  const pending = new Map<string, THREE.Object3D[]>()
  try {
    if (!group.visible) return
    group.refreshWcsChildBoxesFromChildren()
    const childBoxes: AcEdSpatialQueryResultItem[] = group.wcsChildBoxes.map(
      box => ({ ...box })
    )
    const bounds =
      childBoxes.length > 0
        ? unionGroupWcsChildBoxes(group)
        : group.wcsBbox.clone()
    if (childBoxes.length > 0) group.wcsBbox = bounds
    if (process.env.NODE_ENV !== 'production')
      assertAcTrGroupWcsBboxesConsistent(group)

    const hidden: THREE.Object3D[] = []
    for (const child of group.children) {
      if (!child.visible) {
        hidden.push(child)
        continue
      }
      child.userData.ancestorLayerNames = acTrResolveAncestorLayerNames(
        child.userData.ancestorLayerNames,
        group.layerName,
        group.userData.ancestorLayerNames
      )
      const layerName: string = child.userData.layerName ?? '0'
      const bucket = pending.get(layerName)
      if (bucket) bucket.push(child)
      else pending.set(layerName, [child])
      child.parent = null
    }
    // Detach in linear time. Hidden and not-yet-transferred geometry remains
    // owned by this group for disposal, including when the sink throws.
    group.children = hidden
    let registeredChildIndex = false
    for (const [layerName, objects] of pending) {
      const effectiveLayerName = layerName === '0' ? group.layerName : layerName
      const sourceLayer = objects.some(
        object => (object.userData.authoredLayerName ?? layerName) === '0'
      )
        ? '0'
        : layerName
      mapper.remap(objects, sourceLayer, effectiveLayerName)

      const fragment = new AcTrEntity(group.renderContext)
      // Keep reflected/nonuniform native matrices exact; no TRS decomposition.
      fragment.matrix.copy(group.matrix)
      fragment.matrixAutoUpdate = false
      fragment.matrixWorldNeedsUpdate = true
      fragment.objectId = group.objectId
      fragment.ownerId = group.ownerId
      fragment.layerName = effectiveLayerName
      fragment.userData.ancestorLayerNames = acTrResolveAncestorLayerNames(
        group.userData.ancestorLayerNames,
        group.layerName
      )
      fragment.wcsBbox = bounds
      if (!registeredChildIndex && childBoxes.length > 0) {
        ;(
          fragment.userData as {
            spatialIndexChildBoxes?: AcEdSpatialQueryResultItem[]
          }
        ).spatialIndexChildBoxes = childBoxes
        registeredChildIndex = true
      }
      fragment.children = objects
      for (const child of objects) child.parent = fragment
      pending.delete(layerName)
      try {
        fragment.updateMatrixWorld(true)
        sink.addEntity(fragment)
      } finally {
        fragment.dispose()
      }
    }
  } finally {
    for (const objects of pending.values()) {
      for (const child of objects) {
        child.parent = group
        group.children.push(child)
      }
    }
    group.dispose()
  }
}
