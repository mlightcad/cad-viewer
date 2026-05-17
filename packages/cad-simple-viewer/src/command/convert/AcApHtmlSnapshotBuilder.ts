import {
  ACEX_SNAPSHOT_VERSION,
  type AcExLayerSnapshot,
  type AcExLayoutSnapshot,
  type AcExLineBatch,
  type AcExMeshBatch,
  type AcExSnapshotV1,
  buildOsnapCatalog,
  buildViewerMetadata,
  collectBatchesFromObject3D
} from '@mlightcad/cad-html-exporter'
import type { AcDbDatabase } from '@mlightcad/data-model'

import { AcApI18n } from '../../i18n'
import { yieldToMain } from '../../util'
import type { AcTrScene } from '../../view/AcTrScene'

/**
 * Optional overrides applied when constructing an HTML export snapshot.
 */
export interface AcApHtmlSnapshotBuilderOptions {
  /**
   * Human-readable drawing title stored in snapshot metadata and used as the
   * HTML document title when not overridden by the packager.
   */
  title?: string
  /**
   * Canvas background color as a 24-bit RGB integer (e.g. `0x000000`).
   * Defaults to the value from {@link buildViewerMetadata} when omitted.
   */
  background?: number
  /**
   * UI locale embedded in the exported HTML for i18n (`en`, `zh`, etc.).
   * Defaults to {@link AcApI18n.currentLocale} when omitted.
   */
  locale?: string
}

/**
 * Serializes the live Three.js scene into a versioned {@link AcExSnapshotV1}.
 *
 * The snapshot contains layer visibility, per-layout line/mesh batches, and
 * viewer metadata (extents, units, background). It is display-only: no DXF/DWG
 * entities or edit capability are preserved.
 */
export class AcApHtmlSnapshotBuilder {
  /**
   * Builds a snapshot synchronously in one pass.
   *
   * Prefer {@link buildAsync} for interactive export so the UI can stay responsive.
   *
   * @param scene - Current renderer scene (layouts, layers, active layout).
   * @param database - Open drawing database used for layout names and metadata.
   * @param options - Optional title, background, and locale overrides.
   * @returns A complete v1 snapshot ready for `packHtml`.
   */
  build(
    scene: AcTrScene,
    database: AcDbDatabase,
    options: AcApHtmlSnapshotBuilderOptions = {}
  ): AcExSnapshotV1 {
    return this.buildSync(scene, database, options)
  }

  /**
   * Builds a snapshot incrementally, yielding to the main thread between layouts.
   *
   * Geometry is collected per layout layer so a busy indicator can repaint
   * during large drawings.
   *
   * @param scene - Current renderer scene (layouts, layers, active layout).
   * @param database - Open drawing database used for layout names and metadata.
   * @param options - Optional title, background, and locale overrides.
   * @returns A complete v1 snapshot ready for `packHtml`.
   */
  async buildAsync(
    scene: AcTrScene,
    database: AcDbDatabase,
    options: AcApHtmlSnapshotBuilderOptions = {}
  ): Promise<AcExSnapshotV1> {
    await yieldToMain()

    const meta = buildViewerMetadata(database, {
      title: options.title,
      background: options.background
    })

    const layers: AcExLayerSnapshot[] = []
    scene.layers.forEach(layer => {
      layers.push({
        name: layer.name,
        color: layer.color.RGB ?? 0xffffff,
        visible: !layer.isOff && !layer.isFrozen
      })
    })

    const layouts: AcExLayoutSnapshot[] = []
    for (const [btrId, layout] of scene.layouts) {
      const lineBatches: AcExLineBatch[] = []
      const meshBatches: AcExMeshBatch[] = []
      for (const [, layer] of layout.layers) {
        const collected = collectBatchesFromObject3D(layer.internalObject)
        lineBatches.push(...collected.lineBatches)
        meshBatches.push(...collected.meshBatches)
        await yieldToMain()
      }
      layouts.push({
        btrId,
        name: resolveLayoutName(database, btrId),
        isModelSpace: btrId === scene.modelSpaceBtrId,
        lineBatches,
        meshBatches,
        osnap: buildOsnapCatalog(database, btrId)
      })
      await yieldToMain()
    }

    return {
      version: ACEX_SNAPSHOT_VERSION,
      meta: buildSnapshotMeta(meta, options),
      layers,
      layouts,
      activeLayoutBtrId: scene.activeLayoutBtrId || scene.modelSpaceBtrId
    }
  }

  /**
   * Synchronous implementation shared by {@link build} and {@link buildAsync}.
   *
   * @param scene - Current renderer scene.
   * @param database - Open drawing database.
   * @param options - Snapshot overrides.
   * @returns A complete v1 snapshot.
   */
  private buildSync(
    scene: AcTrScene,
    database: AcDbDatabase,
    options: AcApHtmlSnapshotBuilderOptions
  ): AcExSnapshotV1 {
    const meta = buildViewerMetadata(database, {
      title: options.title,
      background: options.background
    })

    const layers: AcExLayerSnapshot[] = []
    scene.layers.forEach(layer => {
      layers.push({
        name: layer.name,
        color: layer.color.RGB ?? 0xffffff,
        visible: !layer.isOff && !layer.isFrozen
      })
    })

    const layouts: AcExLayoutSnapshot[] = []
    scene.layouts.forEach((layout, btrId) => {
      const { lineBatches, meshBatches } = collectBatchesFromObject3D(
        layout.internalObject
      )
      layouts.push({
        btrId,
        name: resolveLayoutName(database, btrId),
        isModelSpace: btrId === scene.modelSpaceBtrId,
        lineBatches,
        meshBatches,
        osnap: buildOsnapCatalog(database, btrId)
      })
    })

    return {
      version: ACEX_SNAPSHOT_VERSION,
      meta: buildSnapshotMeta(meta, options),
      layers,
      layouts,
      activeLayoutBtrId: scene.activeLayoutBtrId || scene.modelSpaceBtrId
    }
  }
}

/**
 * Merges database-derived viewer metadata with export-time options.
 *
 * @param meta - Extents, units, and background from {@link buildViewerMetadata}.
 * @param options - User overrides (title is taken from `meta`; locale from options).
 * @returns The `meta` block stored on {@link AcExSnapshotV1}.
 */
function buildSnapshotMeta(
  meta: ReturnType<typeof buildViewerMetadata>,
  options: AcApHtmlSnapshotBuilderOptions
) {
  return {
    title: meta.title,
    createdAt: new Date().toISOString(),
    extents: meta.extents,
    units: meta.units,
    background: meta.background,
    locale: options.locale ?? AcApI18n.currentLocale
  }
}

/**
 * Resolves a block table record object id to its layout/block name.
 *
 * @param database - Drawing whose block table is searched.
 * @param btrId - Object id of the layout's owning block table record.
 * @returns The record name, or `btrId` if no matching block is found.
 */
function resolveLayoutName(database: AcDbDatabase, btrId: string): string {
  for (const block of database.tables.blockTable.newIterator()) {
    if (block.objectId === btrId) {
      return block.name
    }
  }
  return btrId
}
