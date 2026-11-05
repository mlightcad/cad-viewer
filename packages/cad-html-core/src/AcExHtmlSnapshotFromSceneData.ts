import type { AcDbDatabase } from '@mlightcad/data-model'
import type * as THREE from 'three'

import { acexHtmlGetDocsBaseUrl } from './AcExHtmlDocsUrl'
import { acexHtmlComputeLayoutViewExtents } from './AcExHtmlLayerExtents'
import { acexHtmlBuildOsnapCatalog } from './AcExHtmlOsnapPrimitiveBuilder'
import { acexHtmlCollectLayoutViewports } from './AcExHtmlPaperViewportCollector'
import { acexHtmlCaptureSavedViewExtents } from './AcExHtmlSavedView'
import { acexHtmlCollectBatchesFromObject3D } from './AcExHtmlSceneBatchCollector'
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExHtmlInitialViewMode,
  type AcExHtmlLayerSnapshot,
  type AcExHtmlLayoutSnapshot,
  type AcExHtmlLineBatch,
  type AcExHtmlMeshBatch,
  type AcExHtmlSnapshot,
  type AcExHtmlViewerMode,
  type AcExHtmlViewState
} from './AcExHtmlSnapshotTypes'
import { acexHtmlBuildViewerMetadata } from './AcExHtmlViewerMetadata'

/**
 * Layer table row for an export snapshot (visibility is independent of
 * whether geometry for that layer is present).
 */
export interface AcExHtmlExportLayerMeta {
  name: string
  color: number
  visible: boolean
}

/**
 * One layer's geometry root inside a layout (typically an `AcTrGroup`).
 */
export interface AcExHtmlExportLayoutLayerGeometry {
  name: string
  root: THREE.Object3D
}

/**
 * Layout geometry and identity for snapshot assembly.
 */
export interface AcExHtmlExportLayoutInput {
  btrId: string
  name?: string
  isModelSpace: boolean
  layers: AcExHtmlExportLayoutLayerGeometry[]
}

/**
 * Scene-agnostic input for {@link acexHtmlBuildSnapshotFromExportScene}.
 *
 * Callers (browser `AcTrScene` or a headless exporter) map their scene graph
 * into this shape; core never imports cad-simple-viewer types.
 */
export interface AcExHtmlExportSceneInput {
  layers: AcExHtmlExportLayerMeta[]
  layouts: AcExHtmlExportLayoutInput[]
  activeLayoutBtrId: string
  modelSpaceBtrId: string
}

/**
 * Options for {@link acexHtmlBuildSnapshotFromExportScene}.
 */
export interface AcExHtmlBuildSnapshotOptions {
  title?: string
  background?: number
  locale?: string
  exportInvisibleLayers?: boolean
  exportLayouts?: boolean
  initialView?: AcExHtmlInitialViewMode
  viewState?: AcExHtmlViewState
  viewerMode?: AcExHtmlViewerMode
  canvasAspectRatio?: number
  /** Docs base URL embedded in snapshot meta. Defaults to Acex default. */
  docsBaseUrl?: string
  /**
   * Optional yield between layouts (browser paint / cooperative scheduling).
   * Ignored by the sync builder.
   */
  yieldBetweenLayouts?: () => void | Promise<void>
}

/** One layout-table row used to order and name exported layouts. */
export interface AcExHtmlDatabaseLayoutInfo {
  name: string
  tabOrder: number
  blockTableRecordId: string
}

/**
 * Lists layouts from the drawing's layout table, including model space,
 * sorted by tab order.
 */
export function acexHtmlListDatabaseLayouts(
  database: AcDbDatabase
): AcExHtmlDatabaseLayoutInfo[] {
  const layoutTable = database.objects?.layout
  if (!layoutTable?.newIterator) return []

  const layouts: AcExHtmlDatabaseLayoutInfo[] = []
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
 * Builds an {@link AcExHtmlSnapshot} from database metadata plus pre-built
 * per-layout Object3D layer roots.
 */
export function acexHtmlBuildSnapshotFromExportScene(
  database: AcDbDatabase,
  scene: AcExHtmlExportSceneInput,
  options: AcExHtmlBuildSnapshotOptions = {}
): AcExHtmlSnapshot {
  return buildSnapshotSync(database, scene, options)
}

/**
 * Async variant that optionally yields between layouts.
 */
export async function acexHtmlBuildSnapshotFromExportSceneAsync(
  database: AcDbDatabase,
  scene: AcExHtmlExportSceneInput,
  options: AcExHtmlBuildSnapshotOptions = {}
): Promise<AcExHtmlSnapshot> {
  const yieldFn = options.yieldBetweenLayouts
  if (yieldFn) {
    await yieldFn()
  }

  const exportInvisibleLayers = options.exportInvisibleLayers !== false
  const exportLayouts = options.exportLayouts !== false
  const includeLayer = exportInvisibleLayers
    ? undefined
    : (layerName: string) =>
        shouldExportLayer(scene, layerName, exportInvisibleLayers)

  const meta = acexHtmlBuildViewerMetadata(database, {
    title: options.title,
    background: options.background
  })

  const layers = collectLayerSnapshots(scene, exportInvisibleLayers)
  const tableLayouts = acexHtmlListDatabaseLayouts(database)
  const layoutNames = new Map(
    tableLayouts.map(layout => [layout.blockTableRecordId, layout.name])
  )
  const activeLayoutBtrId = resolveExportActiveLayoutBtrId(scene, exportLayouts)
  const layoutInputs = listExportLayouts(scene, tableLayouts, exportLayouts)

  const layouts: AcExHtmlLayoutSnapshot[] = []
  for (const layoutInput of layoutInputs) {
    layouts.push(
      collectLayoutSnapshot(
        database,
        scene,
        layoutInput,
        layoutNames,
        options,
        includeLayer
      )
    )
    if (yieldFn) {
      await yieldFn()
    }
  }

  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta: buildSnapshotMeta(meta, options, layouts, activeLayoutBtrId),
    layers,
    layouts,
    activeLayoutBtrId
  }
}

function buildSnapshotSync(
  database: AcDbDatabase,
  scene: AcExHtmlExportSceneInput,
  options: AcExHtmlBuildSnapshotOptions
): AcExHtmlSnapshot {
  const exportInvisibleLayers = options.exportInvisibleLayers !== false
  const exportLayouts = options.exportLayouts !== false
  const includeLayer = exportInvisibleLayers
    ? undefined
    : (layerName: string) =>
        shouldExportLayer(scene, layerName, exportInvisibleLayers)

  const meta = acexHtmlBuildViewerMetadata(database, {
    title: options.title,
    background: options.background
  })

  const layers = collectLayerSnapshots(scene, exportInvisibleLayers)
  const tableLayouts = acexHtmlListDatabaseLayouts(database)
  const layoutNames = new Map(
    tableLayouts.map(layout => [layout.blockTableRecordId, layout.name])
  )
  const activeLayoutBtrId = resolveExportActiveLayoutBtrId(scene, exportLayouts)
  const layoutInputs = listExportLayouts(scene, tableLayouts, exportLayouts)

  const layouts: AcExHtmlLayoutSnapshot[] = []
  for (const layoutInput of layoutInputs) {
    layouts.push(
      collectLayoutSnapshot(
        database,
        scene,
        layoutInput,
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

function collectLayerSnapshots(
  scene: AcExHtmlExportSceneInput,
  exportInvisibleLayers: boolean
): AcExHtmlLayerSnapshot[] {
  const layers: AcExHtmlLayerSnapshot[] = []
  for (const layer of scene.layers) {
    if (!shouldExportLayer(scene, layer.name, exportInvisibleLayers)) {
      continue
    }
    layers.push({
      name: layer.name,
      color: layer.color,
      visible: layer.visible
    })
  }
  return layers
}

function buildSnapshotMeta(
  meta: ReturnType<typeof acexHtmlBuildViewerMetadata>,
  options: AcExHtmlBuildSnapshotOptions,
  layouts: AcExHtmlLayoutSnapshot[],
  activeLayoutBtrId: string
) {
  const activeLayout =
    layouts.find(layout => layout.btrId === activeLayoutBtrId) ?? layouts[0]
  const viewExtents = activeLayout
    ? acexHtmlComputeLayoutViewExtents(activeLayout)
    : null
  const initialView = options.initialView ?? 'fit'

  return {
    title: meta.title,
    createdAt: new Date().toISOString(),
    extents: meta.extents,
    viewExtents: viewExtents ?? undefined,
    units: meta.units,
    grip: meta.grip,
    background: meta.background,
    locale: options.locale ?? 'en',
    initialView,
    viewState: initialView === 'current' ? options.viewState : undefined,
    viewerMode: options.viewerMode ?? 'measure',
    exportLayouts: options.exportLayouts !== false,
    docsBaseUrl: options.docsBaseUrl ?? acexHtmlGetDocsBaseUrl()
  }
}

function shouldExportOsnap(options: AcExHtmlBuildSnapshotOptions): boolean {
  return (options.viewerMode ?? 'measure') === 'measure'
}

function shouldExportLayer(
  scene: AcExHtmlExportSceneInput,
  layerName: string,
  exportInvisibleLayers: boolean
): boolean {
  if (exportInvisibleLayers) {
    return true
  }
  const layer = scene.layers.find(entry => entry.name === layerName)
  if (!layer) {
    return true
  }
  return layer.visible
}

function listExportLayouts(
  scene: AcExHtmlExportSceneInput,
  tableLayouts: AcExHtmlDatabaseLayoutInfo[],
  exportLayouts: boolean
): AcExHtmlExportLayoutInput[] {
  if (!exportLayouts) {
    const model = scene.layouts.find(
      layout => layout.btrId === scene.modelSpaceBtrId
    )
    return model ? [model] : []
  }

  const byId = new Map(scene.layouts.map(layout => [layout.btrId, layout]))
  const seen = new Set<string>()
  const result: AcExHtmlExportLayoutInput[] = []

  for (const table of tableLayouts) {
    if (seen.has(table.blockTableRecordId)) continue
    seen.add(table.blockTableRecordId)
    const existing = byId.get(table.blockTableRecordId)
    result.push(
      existing ?? {
        btrId: table.blockTableRecordId,
        name: table.name,
        isModelSpace: table.blockTableRecordId === scene.modelSpaceBtrId,
        layers: []
      }
    )
  }

  for (const layout of scene.layouts) {
    if (seen.has(layout.btrId)) continue
    seen.add(layout.btrId)
    result.push(layout)
  }

  return result
}

function resolveExportActiveLayoutBtrId(
  scene: AcExHtmlExportSceneInput,
  exportLayouts: boolean
): string {
  if (!exportLayouts) {
    return scene.modelSpaceBtrId
  }
  return scene.activeLayoutBtrId || scene.modelSpaceBtrId
}

function collectLayoutSnapshot(
  database: AcDbDatabase,
  scene: AcExHtmlExportSceneInput,
  layoutInput: AcExHtmlExportLayoutInput,
  layoutNames: Map<string, string>,
  options: AcExHtmlBuildSnapshotOptions,
  includeLayer: ((layerName: string) => boolean) | undefined
): AcExHtmlLayoutSnapshot {
  const lineBatches: AcExHtmlLineBatch[] = []
  const meshBatches: AcExHtmlMeshBatch[] = []
  for (const layer of layoutInput.layers) {
    if (includeLayer && !includeLayer(layer.name)) {
      continue
    }
    const collected = acexHtmlCollectBatchesFromObject3D(layer.root)
    // Scene geometry is already bucketed by layer root. Material metadata is
    // not authoritative for every drawable (IMAGE / OLE use a plain
    // MeshBasicMaterial with no `userData.layer`), so stamp the owning layer
    // name onto every batch. Otherwise the offline viewer parents those
    // meshes under layer "0" and they stay visible when this layer is off.
    for (const batch of collected.lineBatches) {
      batch.layer = layer.name
    }
    for (const batch of collected.meshBatches) {
      batch.layer = layer.name
    }
    lineBatches.push(...collected.lineBatches)
    meshBatches.push(...collected.meshBatches)
  }

  const isModelSpace =
    layoutInput.isModelSpace || layoutInput.btrId === scene.modelSpaceBtrId
  const savedView = acexHtmlCaptureSavedViewExtents(
    database,
    layoutInput.btrId,
    isModelSpace,
    options.canvasAspectRatio
  )
  const viewports = acexHtmlCollectLayoutViewports(
    database,
    layoutInput.btrId,
    isModelSpace
  )
  // Persist this layout's own zoom-to-fit box. The offline viewer cannot derive
  // it at open time for progressive packages (chunks have not painted yet) or
  // for layouts that were never active, so both would frame a different box
  // than export-time “Extents”.
  const fitExtents =
    acexHtmlComputeLayoutViewExtents({
      lineBatches,
      meshBatches,
      viewports
    }) ?? undefined

  let osnap: ReturnType<typeof acexHtmlBuildOsnapCatalog> | undefined
  if (shouldExportOsnap(options)) {
    const osnapT0 = performance.now()
    osnap = acexHtmlBuildOsnapCatalog(database, layoutInput.btrId, {
      includeLayer
    })
    console.log(
      `[chtml] osnap catalog ${
        layoutNames.get(layoutInput.btrId) ??
        layoutInput.name ??
        layoutInput.btrId
      }: ${(performance.now() - osnapT0).toFixed(0)} ms (${
        osnap?.primitives.length ?? 0
      } primitives)`
    )
  }

  return {
    btrId: layoutInput.btrId,
    name:
      layoutNames.get(layoutInput.btrId) ??
      layoutInput.name ??
      resolveBlockName(database, layoutInput.btrId),
    isModelSpace,
    lineBatches,
    meshBatches,
    osnap,
    viewports,
    ...(savedView ? { savedView } : {}),
    ...(fitExtents ? { fitExtents } : {})
  }
}

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
