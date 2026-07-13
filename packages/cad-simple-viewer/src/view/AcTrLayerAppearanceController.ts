import {
  AcDbLayerTableRecord,
  AcDbLayerTableRecordAttrs,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import { AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcApLayerService } from '../service/AcApLayerService'
import { AcTrScene } from './AcTrScene'

/**
 * Synchronizes scene drawable materials with live layer-table style changes.
 *
 * The host view ({@link AcTrView2d}) delegates layer add/update and background
 * refresh entry points here so material cache updates, scene fan-out, and text
 * rematerialization stay out of the view class.
 */
export class AcTrLayerAppearanceController {
  /**
   * @param scene - Scene whose layout layer groups receive appearance updates.
   * @param renderer - Renderer whose draw context supplies the active database.
   * @param getLayerTraits - Optional override for resolving live layer-table traits.
   */
  constructor(
    private readonly scene: AcTrScene,
    private readonly renderer: AcTrRenderer,
    private readonly getLayerTraits?: (
      layerName: string
    ) => Partial<AcGiSubEntityTraits> | undefined
  ) {}

  /**
   * Returns true when a layer-table edit may require material refresh.
   *
   * @param changes - Partial layer record attributes from the edit event.
   * @returns True when color, linetype, lineweight, or transparency changed.
   */
  layerStyleMayHaveChanged(
    changes: Partial<AcDbLayerTableRecordAttrs>
  ): boolean {
    return (
      changes.color != null ||
      changes.linetype != null ||
      changes.lineWeight !== undefined ||
      changes.transparency != null
    )
  }

  /**
   * Refreshes cached layer materials from the live layer-table record and
   * propagates the result to batched drawables and text hierarchies.
   *
   * @param layer - Live layer-table record whose traits should drive the refresh.
   */
  syncFromLiveRecord(layer: AcDbLayerTableRecord): void {
    const layerTraits = this.getEffectiveLayerTraits(layer.name)
    if (!layerTraits) {
      return
    }

    const materials = this.renderer.updateLayerMaterial(layer.name, layerTraits)
    this.scene.forEachSceneLayer(layer.name, sceneLayer =>
      sceneLayer.syncAppearanceFromRecord(
        layer.name,
        layerTraits,
        materials,
        this.renderer
      )
    )
  }

  /**
   * Rebinds text materials after INSERT groups are split/reparented or when the
   * canvas background changes (ACI-7 foreground inversion).
   *
   * @param root - Object subtree to traverse for text refresh hooks.
   * @param layerTraits - Optional resolved traits passed through to text wrappers.
   */
  refreshTextMaterialsInObjectTree(
    root: THREE.Object3D,
    layerTraits?: Partial<AcGiSubEntityTraits>
  ): void {
    root.traverse(child => {
      const refresh = (
        child as {
          refreshTextMaterials?: (
            layerTraits?: Partial<AcGiSubEntityTraits>
          ) => void
        }
      ).refreshTextMaterials
      if (typeof refresh === 'function') {
        refresh.call(child, layerTraits)
      }
    })
  }

  /**
   * Builds resolved layer traits used when syncing appearance or remapping INSERT layers.
   *
   * Reads the active draw database from {@link AcTrRenderer.context} unless a custom
   * resolver was supplied to the constructor.
   *
   * @param layerName - Name of the layer to resolve from the active database.
   * @returns Resolved sub-entity traits, or undefined when the layer is missing.
   */
  getEffectiveLayerTraits(
    layerName: string
  ): Partial<AcGiSubEntityTraits> | undefined {
    if (this.getLayerTraits) {
      return this.getLayerTraits(layerName)
    }

    const database = this.renderer.context.database
    if (!database) {
      return undefined
    }

    return AcApLayerService.resolveLayerTraits(database, layerName)
  }
}
