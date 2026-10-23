import { availableParallelism } from 'node:os'

import {
  type AcExExportLayoutInput,
  type AcExExportSceneInput,
  type AcExSnapshot,
  buildSnapshotFromExportScene,
  listDatabaseLayouts
} from '@mlightcad/cad-html-core'
import {
  type AcDbDatabase,
  type AcDbEntity,
  AcDbViewport
} from '@mlightcad/data-model'
import {
  AcTrBatchedGroup,
  type AcTrDirectEntityMeta,
  AcTrEntity,
  AcTrMTextRenderer,
  AcTrRenderer,
  AcTrViewportView,
  tryBuildDirectEntityMeta
} from '@mlightcad/three-renderer'
import * as THREE from 'three'
import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import type { AcExHtmlExporterOptions } from './exportOptions'
import { preloadDrawingFonts, setupExportTextRendering } from './nodeFontLoader'
import { withWorkingDatabase } from './withWorkingDatabase'

interface LayerBucket {
  group: AcTrBatchedGroup
}

interface LayoutBucket {
  btrId: string
  isModelSpace: boolean
  layers: Map<string, LayerBucket>
}

interface PendingDraw {
  drawn: AcTrEntity
  group: AcTrBatchedGroup
}

/**
 * Matches the viewer's deferred glyph pool. Node has no UI to protect, so we
 * scale with CPU count (capped) — serial `await asyncDraw` was the main reason
 * this path was slower than Playwright for text-heavy drawings.
 */
const ASYNC_DRAW_CONCURRENCY = Math.max(8, Math.min(32, availableParallelism()))

/**
 * Converts an open database into an ACEX snapshot without a browser view.
 */
export async function convertDatabaseToSnapshot(
  database: AcDbDatabase,
  options: AcExHtmlExporterOptions = {}
): Promise<AcExSnapshot> {
  return withWorkingDatabase(database, () =>
    convertOpenDatabaseToSnapshot(database, options)
  )
}

async function convertOpenDatabaseToSnapshot(
  database: AcDbDatabase,
  options: AcExHtmlExporterOptions
): Promise<AcExSnapshot> {
  const exportInvisibleLayers = options.exportInvisibleLayers !== false
  const exportLayouts = options.exportLayouts !== false
  const width = options.width ?? 1920
  const height = options.height ?? 1080

  const tFonts = performance.now()
  // TEXT/MTEXT (and glyph linetypes) require an initialized main-thread
  // AcTrMTextRenderer plus a Node-capable FontLoader before worldDraw/asyncDraw.
  await setupExportTextRendering({
    fontsDir: options.fontsDir,
    fontsUrl: options.fontsUrl
  })
  await preloadDrawingFonts(database)
  const fontsMs = performance.now() - tFonts

  const renderer = AcTrRenderer.createForExport({ width, height })
  renderer.context.database = database
  // Browser glyph draws yield every 32ms so the UI can paint. That timer
  // delay only slows a headless export.
  renderer.context.yieldDuringAsyncDraw = false

  const modelSpace = database.tables.blockTable.modelSpace
  const modelSpaceBtrId = modelSpace.objectId
  const tableLayouts = listDatabaseLayouts(database)

  const layoutBtrIds: string[] = []
  if (!exportLayouts) {
    layoutBtrIds.push(modelSpaceBtrId)
  } else {
    const seen = new Set<string>()
    for (const layout of tableLayouts) {
      if (seen.has(layout.blockTableRecordId)) continue
      seen.add(layout.blockTableRecordId)
      layoutBtrIds.push(layout.blockTableRecordId)
    }
    if (!seen.has(modelSpaceBtrId)) {
      layoutBtrIds.unshift(modelSpaceBtrId)
    }
  }

  const layoutBuckets = new Map<string, LayoutBucket>()
  const pendingDraws: PendingDraw[] = []

  const tWorldDraw = performance.now()
  for (const btrId of layoutBtrIds) {
    const block = database.tables.blockTable.getIdAt(btrId)
    if (!block) continue

    const bucket: LayoutBucket = {
      btrId,
      isModelSpace: btrId === modelSpaceBtrId,
      layers: new Map()
    }
    layoutBuckets.set(btrId, bucket)

    for (const entity of block.newIterator()) {
      if (!shouldConvertEntity(entity, database, exportInvisibleLayers)) {
        continue
      }
      if (
        entity instanceof AcDbViewport &&
        AcTrViewportView.isDefaultPaperSpaceViewport(entity)
      ) {
        continue
      }

      const layerName = entity.layer || '0'
      let layerBucket = bucket.layers.get(layerName)
      if (!layerBucket) {
        layerBucket = { group: new AcTrBatchedGroup() }
        bucket.layers.set(layerName, layerBucket)
      }

      const direct = tryBuildDirectEntityMeta(entity, renderer)
      if (direct) {
        try {
          const added = appendDirectEntity(layerBucket.group, direct)
          if (added) {
            continue
          }
        } finally {
          direct.geometry.dispose()
        }
      }

      const drawn = entity.worldDraw(renderer) as AcTrEntity | null
      if (!drawn) continue
      // Defer asyncDraw so glyph/INSERT finalize runs with bounded concurrency
      // (serial await was multi-minute on text-heavy DWGs).
      pendingDraws.push({ drawn, group: layerBucket.group })
    }
  }
  const worldDrawMs = performance.now() - tWorldDraw

  const tAsyncDraw = performance.now()
  await settlePendingDraws(pendingDraws, ASYNC_DRAW_CONCURRENCY)
  const asyncDrawMs = performance.now() - tAsyncDraw

  // setupExportTextRendering disables mesh-glyph InstancedMesh; if that ever
  // changes, flush pending placements into layer groups before snapshot.
  flushMeshGlyphInstancesIntoLayouts(layoutBuckets)

  const layerMeta = collectLayerMeta(database)
  const layouts: AcExExportLayoutInput[] = []
  for (const btrId of layoutBtrIds) {
    const bucket = layoutBuckets.get(btrId)
    layouts.push({
      btrId,
      isModelSpace: btrId === modelSpaceBtrId,
      layers: bucket
        ? [...bucket.layers.entries()].map(([name, layer]) => ({
            name,
            root: layer.group as unknown as THREE.Object3D
          }))
        : []
    })
  }

  const scene: AcExExportSceneInput = {
    layers: layerMeta,
    layouts,
    activeLayoutBtrId: modelSpaceBtrId,
    modelSpaceBtrId
  }

  const tSnapshot = performance.now()
  const snapshot = buildSnapshotFromExportScene(database, scene, {
    title: options.title,
    locale: options.locale ?? 'en',
    exportInvisibleLayers,
    exportLayouts,
    initialView: options.initialView,
    viewerMode: options.viewerMode ?? 'measure',
    canvasAspectRatio: width / height
  })
  const snapshotMs = performance.now() - tSnapshot

  console.info(
    `[cad-html-exporter] convert timings: fonts=${fontsMs.toFixed(0)}ms worldDraw=${worldDrawMs.toFixed(0)}ms asyncDraw=${asyncDrawMs.toFixed(0)}ms (n=${pendingDraws.length}, concurrency=${ASYNC_DRAW_CONCURRENCY}) snapshot=${snapshotMs.toFixed(0)}ms`
  )

  return snapshot
}

/**
 * Parents any pending mesh-glyph InstancedMeshes under export layer groups.
 * Normally a no-op because {@link setupExportTextRendering} disables
 * instancing; kept as a safety net if that default changes.
 */
function flushMeshGlyphInstancesIntoLayouts(
  layoutBuckets: Map<string, LayoutBucket>
): void {
  const mtext = AcTrMTextRenderer.getInstance()
  if (!mtext.getMeshGlyphInstancing()) {
    return
  }
  const layerGroups = new Map<string, THREE.Object3D>()
  // Prefer model-space when the same layer name exists in multiple layouts.
  const ordered = [...layoutBuckets.values()].sort(
    (a, b) => Number(b.isModelSpace) - Number(a.isModelSpace)
  )
  for (const bucket of ordered) {
    for (const [name, layer] of bucket.layers) {
      if (!layerGroups.has(name)) {
        layerGroups.set(name, layer.group as unknown as THREE.Object3D)
      }
    }
  }
  const fallback = new THREE.Group()
  const { placements } = mtext.flushMeshGlyphInstances(
    fallback,
    name => layerGroups.get(name)
  )
  if (placements > 0) {
    console.info(
      `[cad-html-exporter] mesh glyph InstancedMesh flush: placements=${placements}`
    )
  }
}

/**
 * Finalizes deferred glyph/group geometry with a bounded worker pool, then
 * commits each entity into its layer batch group.
 */
async function settlePendingDraws(
  items: PendingDraw[],
  concurrency: number
): Promise<void> {
  if (items.length === 0) return

  let next = 0
  let failed = 0
  const workerCount = Math.max(1, Math.min(concurrency, items.length))
  const workers = Array.from({ length: workerCount }, async () => {
    while (next < items.length) {
      const index = next++
      const item = items[index]
      try {
        await item.drawn.asyncDraw()
        item.group.addEntity(item.drawn)
      } catch {
        failed += 1
        item.drawn.dispose()
      }
    }
  })
  await Promise.all(workers)
  if (failed > 0) {
    console.warn(
      `[cad-html-exporter] ${failed} entities failed during asyncDraw and were omitted`
    )
  }
}

function shouldConvertEntity(
  entity: AcDbEntity,
  database: AcDbDatabase,
  exportInvisibleLayers: boolean
): boolean {
  if (entity.visibility === false) {
    return false
  }
  if (exportInvisibleLayers) {
    return true
  }
  const layerName = entity.layer || '0'
  const layer = database.tables.layerTable.getAt(layerName)
  if (!layer) {
    return true
  }
  return !layer.isOff && !layer.isFrozen
}

function collectLayerMeta(database: AcDbDatabase) {
  const layers: { name: string; color: number; visible: boolean }[] = []
  const table = database.tables.layerTable
  if (!table?.newIterator) {
    return layers
  }
  for (const layer of table.newIterator()) {
    layers.push({
      name: layer.name,
      color: layer.color?.RGB ?? 0xffffff,
      visible: !layer.isOff && !layer.isFrozen
    })
  }
  return layers
}

function appendDirectEntity(
  group: AcTrBatchedGroup,
  meta: AcTrDirectEntityMeta
): boolean {
  const options = {
    objectId: meta.objectId,
    visible: meta.visible,
    position: meta.position
  }
  if (meta.kind === 'lineFat') {
    return group.appendLine2Geometry(
      meta.geometry as LineSegmentsGeometry,
      meta.material,
      meta.worldOffset,
      options
    )
  }
  if (meta.kind === 'lineBasic') {
    return group.appendLineGeometry(
      meta.geometry as THREE.BufferGeometry,
      meta.material,
      meta.worldOffset,
      options
    )
  }
  if (meta.kind === 'point') {
    return group.appendPointGeometry(
      meta.geometry as THREE.BufferGeometry,
      meta.material,
      meta.worldOffset,
      options
    )
  }
  if (meta.kind === 'mesh') {
    return group.appendMeshGeometry(
      meta.geometry as THREE.BufferGeometry,
      meta.material,
      meta.worldOffset,
      options
    )
  }
  return false
}
