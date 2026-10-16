import type { AcDbDatabase } from '@mlightcad/data-model'
import type * as THREE from 'three'

import { acexGetDocsBaseUrl } from './AcExDocsUrl'
import { computeLayoutViewExtents } from './AcExLayerExtents'
import { buildOsnapCatalog } from './AcExOsnapPrimitiveBuilder'
import { collectLayoutViewports } from './AcExPaperViewportCollector'
import { captureAcExSavedViewExtents } from './AcExSavedView'
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
 * Layer table row for an export snapshot (visibility is independent of
 * whether geometry for that layer is present).
 */
export interface AcExExportLayerMeta {
  name: string
  color: number
  visible: boolean
}

/**
 * One layer's geometry root inside a layout (typically an `AcTrGroup`).
 */
export interface AcExExportLayoutLayerGeometry {
  name: string
  root: THREE.Object3D
}

/**
 * Layout geometry and identity for snapshot assembly.
 */
export interface AcExExportLayoutInput {
  btrId: string
  name?: string
  isModelSpace: boolean
  layers: AcExExportLayoutLayerGeometry[]
}

/**
 * Scene-agnostic input for {@link buildSnapshotFromExportScene}.
 *
 * Callers (browser `AcTrScene` or a headless exporter) map their scene graph
 * into this shape; core never imports cad-simple-viewer types.
 */
export interface AcExExportSceneInput {
  layers: AcExExportLayerMeta[]
  layouts: AcExExportLayoutInput[]
  activeLayoutBtrId: string
  modelSpaceBtrId: string
}

/**
 * Options for {@link buildSnapshotFromExportScene}.
 */
export interface AcExBuildSnapshotOptions {
  title?: string
  background?: number
  locale?: string
  exportInvisibleLayers?: boolean
  exportLayouts?: boolean
  initialView?: AcExInitialViewMode
  viewState?: AcExViewState
  viewerMode?: AcExViewerMode
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
export interface AcExDatabaseLayoutInfo {
  name: string
  tabOrder: number
  blockTableRecordId: string
}

/**
 * Lists layouts from the drawing's layout table, including model space,
 * sorted by tab order.
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
 * Builds an {@link AcExSnapshot} from database metadata plus pre-built
 * per-layout Object3D layer roots.
 */
export function buildSnapshotFromExportScene(
  database: AcDbDatabase,
  scene: AcExExportSceneInput,
  options: AcExBuildSnapshotOptions = {}
): AcExSnapshot {
  return buildSnapshotSync(database, scene, options)
}

/**
 * Async variant that optionally yields between layouts.
 */
export async function buildSnapshotFromExportSceneAsync(
  database: AcDbDatabase,
  scene: AcExExportSceneInput,
  options: AcExBuildSnapshotOptions = {}
): Promise<AcExSnapshot> {
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

  const meta = buildViewerMetadata(database, {
    title: options.title,
    background: options.background
  })

  const layers = collectLayerSnapshots(scene, exportInvisibleLayers)
  const tableLayouts = listDatabaseLayouts(database)
  const layoutNames = new Map(
    tableLayouts.map(layout => [layout.blockTableRecordId, layout.name])
  )
  const activeLayoutBtrId = resolveExportActiveLayoutBtrId(scene, exportLayouts)
  const layoutInputs = listExportLayouts(scene, tableLayouts, exportLayouts)

  const layouts: AcExLayoutSnapshot[] = []
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
    meta: buildSnapshotMeta(
      meta,
      options,
      layouts,
      activeLayoutBtrId
    ),
    layers,
    layouts,
    activeLayoutBtrId
  }
}

function buildSnapshotSync(
  database: AcDbDatabase,
  scene: AcExExportSceneInput,
  options: AcExBuildSnapshotOptions
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

  const layers = collectLayerSnapshots(scene, exportInvisibleLayers)
  const tableLayouts = listDatabaseLayouts(database)
  const layoutNames = new Map(
    tableLayouts.map(layout => [layout.blockTableRecordId, layout.name])
  )
  const activeLayoutBtrId = resolveExportActiveLayoutBtrId(scene, exportLayouts)
  const layoutInputs = listExportLayouts(scene, tableLayouts, exportLayouts)

  const layouts: AcExLayoutSnapshot[] = []
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
    meta: buildSnapshotMeta(
      meta,
      options,
      layouts,
      activeLayoutBtrId
    ),
    layers,
    layouts,
    activeLayoutBtrId
  }
}

function collectLayerSnapshots(
  scene: AcExExportSceneInput,
  exportInvisibleLayers: boolean
): AcExLayerSnapshot[] {
  const layers: AcExLayerSnapshot[] = []
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
  meta: ReturnType<typeof buildViewerMetadata>,
  options: AcExBuildSnapshotOptions,
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
    grip: meta.grip,
    background: meta.background,
    locale: options.locale ?? 'en',
    initialView,
    viewState: initialView === 'current' ? options.viewState : undefined,
    viewerMode: options.viewerMode ?? 'measure',
    exportLayouts: options.exportLayouts !== false,
    docsBaseUrl: options.docsBaseUrl ?? acexGetDocsBaseUrl()
  }
}

function shouldExportOsnap(options: AcExBuildSnapshotOptions): boolean {
  return (options.viewerMode ?? 'measure') === 'measure'
}

function shouldExportLayer(
  scene: AcExExportSceneInput,
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
  scene: AcExExportSceneInput,
  tableLayouts: AcExDatabaseLayoutInfo[],
  exportLayouts: boolean
): AcExExportLayoutInput[] {
  if (!exportLayouts) {
    const model = scene.layouts.find(
      layout => layout.btrId === scene.modelSpaceBtrId
    )
    return model ? [model] : []
  }

  const byId = new Map(scene.layouts.map(layout => [layout.btrId, layout]))
  const seen = new Set<string>()
  const result: AcExExportLayoutInput[] = []

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
  scene: AcExExportSceneInput,
  exportLayouts: boolean
): string {
  if (!exportLayouts) {
    return scene.modelSpaceBtrId
  }
  return scene.activeLayoutBtrId || scene.modelSpaceBtrId
}

function collectLayoutSnapshot(
  database: AcDbDatabase,
  scene: AcExExportSceneInput,
  layoutInput: AcExExportLayoutInput,
  layoutNames: Map<string, string>,
  options: AcExBuildSnapshotOptions,
  includeLayer: ((layerName: string) => boolean) | undefined
): AcExLayoutSnapshot {
  const lineBatches: AcExLineBatch[] = []
  const meshBatches: AcExMeshBatch[] = []
  for (const layer of layoutInput.layers) {
    if (includeLayer && !includeLayer(layer.name)) {
      continue
    }
    const collected = collectBatchesFromObject3D(layer.root)
    lineBatches.push(...collected.lineBatches)
    meshBatches.push(...collected.meshBatches)
  }

  const isModelSpace =
    layoutInput.isModelSpace || layoutInput.btrId === scene.modelSpaceBtrId
  const savedView = captureAcExSavedViewExtents(
    database,
    layoutInput.btrId,
    isModelSpace,
    options.canvasAspectRatio
  )

  let osnap: ReturnType<typeof buildOsnapCatalog> | undefined
  if (shouldExportOsnap(options)) {
    const osnapT0 = performance.now()
    osnap = buildOsnapCatalog(database, layoutInput.btrId, { includeLayer })
    console.log(
      `[chtml] osnap catalog ${
        layoutNames.get(layoutInput.btrId) ?? layoutInput.name ?? layoutInput.btrId
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
    viewports: collectLayoutViewports(database, layoutInput.btrId, isModelSpace),
    ...(savedView ? { savedView } : {})
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
