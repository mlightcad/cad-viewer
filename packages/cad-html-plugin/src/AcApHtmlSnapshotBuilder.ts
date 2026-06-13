import {
  AcApI18n,
  type AcTrScene,
  yieldToMain
} from '@mlightcad/cad-simple-viewer'
import type { AcDbDatabase } from '@mlightcad/data-model'

import { computeLayoutExtents } from './AcExLayerExtents'
import { buildOsnapCatalog } from './AcExOsnapPrimitiveBuilder'
import { collectBatchesFromObject3D } from './AcExSceneBatchCollector'
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExInitialViewMode,
  type AcExLayerSnapshot,
  type AcExLayoutSnapshot,
  type AcExLineBatch,
  type AcExMeshBatch,
  type AcExSnapshot,
  type AcExViewState
} from './AcExSnapshotTypes'
import { buildViewerMetadata } from './AcExViewerMetadata'

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
  /**
   * When `false`, geometry and layer-table entries for off/frozen layers are
   * omitted from the snapshot. Defaults to `true`.
   */
  exportInvisibleLayers?: boolean
  /**
   * Initial framing when the exported HTML is opened. Defaults to `'fit'`.
   */
  initialView?: AcExInitialViewMode
  /**
   * Saved view center and zoom when {@link AcApHtmlSnapshotBuilderOptions.initialView}
   * is `'current'`.
   */
  viewState?: AcExViewState
}

/**
 * Serializes the live Three.js scene into a versioned {@link AcExSnapshot}.
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
  ): AcExSnapshot {
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
  ): Promise<AcExSnapshot> {
    await yieldToMain()

    const exportInvisibleLayers = options.exportInvisibleLayers !== false
    const includeLayer = exportInvisibleLayers
      ? undefined
      : (layerName: string) =>
          shouldExportLayer(scene, layerName, exportInvisibleLayers)
    const meta = buildViewerMetadata(database, {
      title: options.title,
      background: options.background
    })

    const layers: AcExLayerSnapshot[] = []
    scene.layers.forEach(layer => {
      if (!shouldExportLayer(scene, layer.name, exportInvisibleLayers)) {
        return
      }
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
        if (!shouldExportLayer(scene, layer.name, exportInvisibleLayers)) {
          continue
        }
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
        osnap: buildOsnapCatalog(database, btrId, { includeLayer })
      })
      await yieldToMain()
    }

    return {
      version: ACEX_SNAPSHOT_VERSION,
      meta: buildSnapshotMeta(
        meta,
        options,
        layouts,
        scene.activeLayoutBtrId || scene.modelSpaceBtrId
      ),
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
  ): AcExSnapshot {
    const exportInvisibleLayers = options.exportInvisibleLayers !== false
    const includeLayer = exportInvisibleLayers
      ? undefined
      : (layerName: string) =>
          shouldExportLayer(scene, layerName, exportInvisibleLayers)
    const meta = buildViewerMetadata(database, {
      title: options.title,
      background: options.background
    })

    const layers: AcExLayerSnapshot[] = []
    scene.layers.forEach(layer => {
      if (!shouldExportLayer(scene, layer.name, exportInvisibleLayers)) {
        return
      }
      layers.push({
        name: layer.name,
        color: layer.color.RGB ?? 0xffffff,
        visible: !layer.isOff && !layer.isFrozen
      })
    })

    const layouts: AcExLayoutSnapshot[] = []
    scene.layouts.forEach((layout, btrId) => {
      const lineBatches: AcExLineBatch[] = []
      const meshBatches: AcExMeshBatch[] = []
      for (const [, layer] of layout.layers) {
        if (!shouldExportLayer(scene, layer.name, exportInvisibleLayers)) {
          continue
        }
        const collected = collectBatchesFromObject3D(layer.internalObject)
        lineBatches.push(...collected.lineBatches)
        meshBatches.push(...collected.meshBatches)
      }
      layouts.push({
        btrId,
        name: resolveLayoutName(database, btrId),
        isModelSpace: btrId === scene.modelSpaceBtrId,
        lineBatches,
        meshBatches,
        osnap: buildOsnapCatalog(database, btrId, { includeLayer })
      })
    })

    return {
      version: ACEX_SNAPSHOT_VERSION,
      meta: buildSnapshotMeta(
        meta,
        options,
        layouts,
        scene.activeLayoutBtrId || scene.modelSpaceBtrId
      ),
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
 * @param layouts - Exported layouts used to derive {@link AcExSnapshot.meta.viewExtents}.
 * @param activeLayoutBtrId - Layout shown when the HTML file is first opened.
 * @returns The `meta` block stored on {@link AcExSnapshot}.
 */
function buildSnapshotMeta(
  meta: ReturnType<typeof buildViewerMetadata>,
  options: AcApHtmlSnapshotBuilderOptions,
  layouts: AcExLayoutSnapshot[],
  activeLayoutBtrId: string
) {
  const activeLayout =
    layouts.find(layout => layout.btrId === activeLayoutBtrId) ?? layouts[0]
  const viewExtents = activeLayout
    ? computeLayoutExtents(activeLayout.lineBatches, activeLayout.meshBatches)
    : null
  const initialView = options.initialView ?? 'fit'

  return {
    title: meta.title,
    createdAt: new Date().toISOString(),
    extents: meta.extents,
    viewExtents: viewExtents ?? undefined,
    units: meta.units,
    background: meta.background,
    locale: options.locale ?? AcApI18n.currentLocale,
    initialView,
    viewState: initialView === 'current' ? options.viewState : undefined
  }
}

function shouldExportLayer(
  scene: AcTrScene,
  layerName: string,
  exportInvisibleLayers: boolean
): boolean {
  if (exportInvisibleLayers) {
    return true
  }

  const layer = scene.layers.get(layerName)
  if (!layer) {
    return true
  }

  return !layer.isOff && !layer.isFrozen
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
