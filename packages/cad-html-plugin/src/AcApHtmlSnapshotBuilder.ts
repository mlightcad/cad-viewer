import { AcApI18n, type AcTrScene } from '@mlightcad/cad-simple-viewer'
import { accmYieldForPaint, type AcDbDatabase } from '@mlightcad/data-model'

import { computeLayoutViewExtents } from './AcExLayerExtents'
import { buildOsnapCatalog } from './AcExOsnapPrimitiveBuilder'
import { collectLayoutViewports } from './AcExPaperViewportCollector'
import { collectBatchesFromObject3D } from './AcExSceneBatchCollector'
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExInitialViewMode,
  type AcExLayerSnapshot,
  type AcExLayoutSnapshot,
  type AcExLineBatch,
  type AcExMeshBatch,
  type AcExSnapshot,
  type AcExViewerMode,
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
   * When `false`, only model space is written into the snapshot. Defaults to
   * `true`.
   */
  exportLayouts?: boolean
  /**
   * Initial framing when the exported HTML is opened. Defaults to `'fit'`.
   */
  initialView?: AcExInitialViewMode
  /**
   * Saved view center and zoom when {@link AcApHtmlSnapshotBuilderOptions.initialView}
   * is `'current'`.
   */
  viewState?: AcExViewState
  /**
   * Offline viewer capability profile. When `'view'`, OSNAP catalogs are omitted.
   */
  viewerMode?: AcExViewerMode
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
    await accmYieldForPaint()

    const exportInvisibleLayers = options.exportInvisibleLayers !== false
    const exportLayouts = options.exportLayouts !== false
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

    const tableLayouts = listDatabaseLayouts(database)
    const layoutNames = new Map(
      tableLayouts.map(layout => [layout.blockTableRecordId, layout.name])
    )
    const activeLayoutBtrId = resolveExportActiveLayoutBtrId(
      scene,
      exportLayouts
    )
    const layouts: AcExLayoutSnapshot[] = []
    for (const btrId of listExportLayoutBtrIds(
      scene,
      tableLayouts,
      exportLayouts
    )) {
      layouts.push(
        collectLayoutSnapshot(
          scene,
          database,
          btrId,
          layoutNames,
          options,
          includeLayer
        )
      )
      await accmYieldForPaint()
    }

    return {
      version: ACEX_SNAPSHOT_VERSION,
      meta: buildSnapshotMeta(meta, options, layouts, activeLayoutBtrId),
      layers,
      layouts,
      activeLayoutBtrId
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
    const exportLayouts = options.exportLayouts !== false
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

    const tableLayouts = listDatabaseLayouts(database)
    const layoutNames = new Map(
      tableLayouts.map(layout => [layout.blockTableRecordId, layout.name])
    )
    const activeLayoutBtrId = resolveExportActiveLayoutBtrId(
      scene,
      exportLayouts
    )
    const layouts: AcExLayoutSnapshot[] = []
    for (const btrId of listExportLayoutBtrIds(
      scene,
      tableLayouts,
      exportLayouts
    )) {
      layouts.push(
        collectLayoutSnapshot(
          scene,
          database,
          btrId,
          layoutNames,
          options,
          includeLayer
        )
      )
    }

    return {
      version: ACEX_SNAPSHOT_VERSION,
      meta: buildSnapshotMeta(meta, options, layouts, activeLayoutBtrId),
      layers,
      layouts,
      activeLayoutBtrId
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
    ? computeLayoutViewExtents(activeLayout)
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
    viewState: initialView === 'current' ? options.viewState : undefined,
    viewerMode: options.viewerMode ?? 'measure',
    exportLayouts: options.exportLayouts !== false
  }
}

function shouldExportOsnap(options: AcApHtmlSnapshotBuilderOptions): boolean {
  return (options.viewerMode ?? 'measure') === 'measure'
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

/** One layout-table row used to order and name exported layouts. */
interface AcExDatabaseLayoutInfo {
  name: string
  tabOrder: number
  blockTableRecordId: string
}

/**
 * Lists layouts from the drawing's layout table, including model space,
 * sorted by tab order. Used so HTML export covers paper-space tabs that
 * were never visited (and may be missing from {@link AcTrScene.layouts}).
 *
 * @param database - Open drawing database.
 * @returns Layouts in tab order; empty when the layout table is unavailable.
 */
export function listDatabaseLayouts(
  database: AcDbDatabase
): AcExDatabaseLayoutInfo[] {
  const layoutTable = database.objects?.layout
  if (!layoutTable?.newIterator) return []

  const layouts: AcExDatabaseLayoutInfo[] = []
  for (const layout of layoutTable.newIterator()) {
    const blockTableRecordId = layout.blockTableRecordId
    if (!blockTableRecordId) continue
    layouts.push({
      name: layout.layoutName || blockTableRecordId,
      tabOrder: layout.tabOrder ?? 0,
      blockTableRecordId
    })
  }
  layouts.sort((a, b) => a.tabOrder - b.tabOrder)
  return layouts
}

/**
 * Ordered BTR ids to export: layout-table tabs first (tab order), then any
 * extra scene layouts that are not in the table. When `exportLayouts` is
 * `false`, only model space is included.
 */
function listExportLayoutBtrIds(
  scene: AcTrScene,
  tableLayouts: AcExDatabaseLayoutInfo[],
  exportLayouts: boolean
): string[] {
  if (!exportLayouts) {
    return scene.modelSpaceBtrId ? [scene.modelSpaceBtrId] : []
  }

  const seen = new Set<string>()
  const ids: string[] = []
  for (const layout of tableLayouts) {
    if (seen.has(layout.blockTableRecordId)) continue
    seen.add(layout.blockTableRecordId)
    ids.push(layout.blockTableRecordId)
  }
  for (const btrId of scene.layouts.keys()) {
    if (seen.has(btrId)) continue
    seen.add(btrId)
    ids.push(btrId)
  }
  return ids
}

function resolveExportActiveLayoutBtrId(
  scene: AcTrScene,
  exportLayouts: boolean
): string {
  if (!exportLayouts) {
    return scene.modelSpaceBtrId
  }
  return scene.activeLayoutBtrId || scene.modelSpaceBtrId
}

function collectLayoutSnapshot(
  scene: AcTrScene,
  database: AcDbDatabase,
  btrId: string,
  layoutNames: Map<string, string>,
  options: AcApHtmlSnapshotBuilderOptions,
  includeLayer: ((layerName: string) => boolean) | undefined
): AcExLayoutSnapshot {
  const lineBatches: AcExLineBatch[] = []
  const meshBatches: AcExMeshBatch[] = []
  const layout = scene.layouts.get(btrId)
  if (layout) {
    for (const [, layer] of layout.layers) {
      if (includeLayer && !includeLayer(layer.name)) {
        continue
      }
      const collected = collectBatchesFromObject3D(layer.internalObject)
      lineBatches.push(...collected.lineBatches)
      meshBatches.push(...collected.meshBatches)
    }
  }
  const isModelSpace = btrId === scene.modelSpaceBtrId
  return {
    btrId,
    name: layoutNames.get(btrId) ?? resolveBlockName(database, btrId),
    isModelSpace,
    lineBatches,
    meshBatches,
    osnap: shouldExportOsnap(options)
      ? buildOsnapCatalog(database, btrId, { includeLayer })
      : undefined,
    viewports: collectLayoutViewports(database, btrId, isModelSpace)
  }
}

/**
 * Resolves a layout BTR id to the block-table record name when the layout
 * table has no matching row.
 */
function resolveBlockName(database: AcDbDatabase, btrId: string): string {
  const blockTable = database.tables?.blockTable
  if (blockTable?.newIterator) {
    for (const block of blockTable.newIterator()) {
      if (block.objectId === btrId) {
        return block.name
      }
    }
  }
  return btrId
}
