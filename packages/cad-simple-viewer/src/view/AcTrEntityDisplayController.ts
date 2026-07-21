import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbEntity,
  AcDbLayerTableRecordAttrs,
  AcDbObjectId
} from '@mlightcad/data-model'

import { AcEdLayerInfo } from '../editor'
import { AcTrLayer } from './AcTrLayer'

type AcTrEntityDisplayCandidate = Pick<AcDbEntity, 'visibility' | 'layer'>

/**
 * Resolves whether database entities should be converted into scene geometry.
 *
 * Entity-level {@link AcDbEntity.visibility} only reflects per-entity hide state
 * (DXF code 60). Layer off/frozen state is tracked separately on the layer table
 * so off-layer content can be skipped at open time and converted later when the
 * layer becomes visible again.
 *
 * Block references (INSERTs) are special: freezing the INSERT layer hides the
 * entire reference, but turning the INSERT layer **off** must still convert the
 * block so nested geometry on other layers can remain visible (AutoCAD Off vs
 * Freeze semantics).
 *
 * The host view ({@link AcTrView2d}) supplies layer metadata and performs batch
 * conversion through its existing entity pipeline.
 */
export class AcTrEntityDisplayController {
  constructor(
    private readonly getLayerInfo: (
      layerName: string
    ) => AcEdLayerInfo | undefined
  ) {}

  /**
   * Returns true when an entity should be converted into scene geometry now.
   */
  shouldConvert(entity: AcTrEntityDisplayCandidate): boolean {
    if (!entity.visibility) {
      return false
    }

    const layer = this.getLayerInfo(entity.layer)
    if (!layer) {
      return true
    }

    if (this.isBlockReference(entity)) {
      // INSERT: skip only when frozen. Off still converts so multi-layer
      // contents on other layers can show.
      return !layer.isFrozen
    }

    return AcTrLayer.isLayerVisible(layer)
  }

  /**
   * Returns true when an entity should be converted for offline export.
   *
   * Export snapshots carry layer on/off state separately; geometry for off layers
   * must still be present so the HTML layer panel can toggle visibility.
   */
  shouldConvertForExport(
    entity: AcTrEntityDisplayCandidate,
    includeInvisibleLayers = true
  ): boolean {
    if (!entity.visibility) {
      return false
    }

    if (includeInvisibleLayers) {
      return true
    }

    return this.shouldConvert(entity)
  }

  /**
   * Returns true when a layer visibility change may have made entities drawable.
   */
  layerVisibilityMayHaveChanged(
    changes: Partial<AcDbLayerTableRecordAttrs>
  ): boolean {
    return changes.isOff !== undefined || changes.standardFlags !== undefined
  }

  /**
   * Collects entities on the given layer that were skipped while the layer was
   * off/frozen and therefore are not yet present in the scene.
   *
   * For INSERTs, entities are collected when the INSERT layer is no longer
   * frozen (Off alone does not skip conversion).
   */
  collectMissingEntitiesOnLayer(
    layerName: string,
    blockTableRecord: AcDbBlockTableRecord,
    hasEntity: (objectId: AcDbObjectId) => boolean
  ): AcDbEntity[] {
    return this.collectMissingEntities(
      blockTableRecord,
      hasEntity,
      entity => entity.layer === layerName && this.shouldConvert(entity)
    )
  }

  /**
   * Collects drawable entities missing from the scene across an entire layout,
   * including entities on off/frozen layers skipped during interactive viewing.
   */
  collectMissingEntitiesForExport(
    blockTableRecord: AcDbBlockTableRecord,
    hasEntity: (objectId: AcDbObjectId) => boolean,
    includeInvisibleLayers = true
  ): AcDbEntity[] {
    return this.collectMissingEntities(blockTableRecord, hasEntity, entity =>
      this.shouldConvertForExport(entity, includeInvisibleLayers)
    )
  }

  private isBlockReference(entity: AcTrEntityDisplayCandidate): boolean {
    return entity instanceof AcDbBlockReference
  }

  private collectMissingEntities(
    blockTableRecord: AcDbBlockTableRecord,
    hasEntity: (objectId: AcDbObjectId) => boolean,
    includeEntity: (entity: AcDbEntity) => boolean
  ): AcDbEntity[] {
    const pending: AcDbEntity[] = []
    const iterator = blockTableRecord.newIterator()
    for (const entity of iterator) {
      if (!includeEntity(entity)) {
        continue
      }
      if (hasEntity(entity.objectId)) {
        continue
      }
      pending.push(entity)
    }
    return pending
  }
}
