import {
  accmYieldForPaint,
  type AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbRenderingCache,
  AcDbViewport,
  acgiIsLightBackground
} from '@mlightcad/data-model'
import { PDFDocument, PDFImage } from 'pdf-lib'

import type { AcPdfExportOptions } from './AcPdfExportOptions'
import { createPdfFormRegistry } from './pdf/AcPdfContentWriter'
import { AcPdfFontManager } from './pdf/AcPdfFontManager'
import { AcPdfOcgManager } from './pdf/AcPdfOcgManager'
import { AcPdfEntity } from './renderer/AcPdfEntity'
import { AcPdfRenderer } from './renderer/AcPdfRenderer'
import {
  buildViewportModelContent,
  collectBlockRoots,
  collectModelSpaceRoots,
  isPaperSpaceBlock
} from './viewport/AcPdfPaperSpaceExport'

/**
 * Renders a drawing database to a vector PDF.
 *
 * Walks the requested block (model space by default) through
 * {@link AcPdfRenderer} and serializes the recorded drawables with pdf-lib.
 */
export async function exportDatabaseToPdf(
  db: AcDbDatabase,
  options: AcPdfExportOptions = {}
): Promise<Uint8Array> {
  const layouts =
    options.layouts === 'all' && !options.blockName && !options.blockId
      ? collectExportLayouts(db)
      : undefined

  AcPdfRenderer.prepareExport()
  const renderer = createConfiguredRenderer(db, options)
  try {
    if (layouts) {
      return await exportLayoutsToPdf(db, options, renderer, layouts)
    }
    const block = resolveTargetBlock(db, options)
    if (!block) {
      throw new Error(
        `Block '${options.blockName}' was not found in the drawing database`
      )
    }
    const roots = await collectLayoutRoots(db, renderer, block, {})
    const bytes = await renderer.exportAsync(roots)
    return bytes
  } finally {
    AcDbRenderingCache.instance.clear()
  }
}

interface ExportLayoutEntry {
  layoutName?: string
  blockTableRecordId: string
  tabOrder?: number
}

/**
 * Lists layouts ordered by tab, or `null` when the database does not expose a
 * layout table (single-layout export then runs as before).
 */
function collectExportLayouts(db: AcDbDatabase): ExportLayoutEntry[] | null {
  const layoutTable = (
    db as {
      objects?: {
        layout?: {
          newIterator?: () => Iterable<ExportLayoutEntry>
        }
      }
    }
  ).objects?.layout
  if (!layoutTable?.newIterator) {
    return null
  }
  const entries = [...layoutTable.newIterator()]
  const layouts = entries
    .filter(layout => !!layout.blockTableRecordId)
    .sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0))
  return layouts.length > 1 ? layouts : null
}

function createConfiguredRenderer(
  db: AcDbDatabase,
  options: AcPdfExportOptions
): AcPdfRenderer {
  const renderer = new AcPdfRenderer()
  renderer.insunits = db.insunits ?? 4
  renderer.ltscale = options.ltscale ?? db.ltscale
  renderer.celtscale = options.celtscale ?? db.celtscale
  renderer.showLineWeight = options.showLineWeight ?? !!db.lwdisplay
  renderer.configureExport(options)
  if (options.textMode === 'text' && options.textFontResolver) {
    renderer.textFontManager = new AcPdfFontManager(options.textFontResolver)
  }

  const background =
    options.background === 'none' || options.background == null
      ? 0xffffff
      : options.background
  renderer.currentBackgroundColor = background
  renderer.changeForeground(acgiIsLightBackground(background) ? 0x000000 : 0xffffff)
  renderer.context.database = db
  return renderer
}

function resolveTargetBlock(
  db: AcDbDatabase,
  options: AcPdfExportOptions
): AcDbBlockTableRecord | undefined {
  if (options.blockId) {
    return db.tables.blockTable.getIdAt(options.blockId)
  }
  if (options.blockName) {
    return db.tables.blockTable.getAt(options.blockName)
  }
  return (
    db.tables.blockTable.getIdAt(db.currentSpaceId) ??
    db.tables.blockTable.modelSpace
  )
}

/**
 * Resolves a layout entry's block table record.
 *
 * Some DWG databases never register the model-space block record handle in
 * the database handle registry, so `getIdAt` fails for the Model layout even
 * though the record itself is reachable via `blockTable.modelSpace`. Match on
 * the model-space object id first, then fall back to the registry lookup.
 */
function resolveLayoutBlock(
  db: AcDbDatabase,
  layout: ExportLayoutEntry
): AcDbBlockTableRecord | undefined {
  if (layout.blockTableRecordId === db.tables.blockTable.modelSpace.objectId) {
    return db.tables.blockTable.modelSpace
  }
  return db.tables.blockTable.getIdAt(layout.blockTableRecordId)
}

/** Lazily populated, export-scoped model-space drawable tree. */
interface ModelRootCache {
  roots?: AcPdfEntity[]
}

async function getModelRoots(
  db: AcDbDatabase,
  renderer: AcPdfRenderer,
  cache: ModelRootCache
): Promise<AcPdfEntity[]> {
  if (!cache.roots) {
    cache.roots = await collectModelSpaceRoots(db, renderer)
  }
  return cache.roots
}

/**
 * Walks one layout block and returns its page roots.
 *
 * Model space is traversed at most once per export: the same drawable tree
 * backs the model page and every paper-space viewport (see
 * {@link AcPdfViewportContent}), avoiding both repeated tessellation and
 * per-viewport geometry clones.
 */
async function collectLayoutRoots(
  db: AcDbDatabase,
  renderer: AcPdfRenderer,
  block: AcDbBlockTableRecord,
  modelCache: ModelRootCache
): Promise<AcPdfEntity[]> {
  if (!isPaperSpaceBlock(db, block)) {
    return getModelRoots(db, renderer, modelCache)
  }

  const viewportEntities: AcDbViewport[] = []
  for (const entity of block.newIterator()) {
    if (entity instanceof AcDbViewport) {
      viewportEntities.push(entity)
    }
  }

  // Paper-space INSERTs hit the same async-clone race as model space; use
  // the two-pass collector so block text is filled before INSERT clones.
  const paperRoots = await collectBlockRoots(block, renderer)

  const viewportContents: AcPdfEntity[] = []
  if (viewportEntities.length > 0) {
    const modelRoots = await getModelRoots(db, renderer, modelCache)
    for (const viewport of viewportEntities) {
      const built = buildViewportModelContent(
        viewport,
        () => modelRoots,
        renderer
      )
      if (built) {
        viewportContents.push(built.content)
        if (built.border) {
          paperRoots.push(built.border)
        }
      }
    }
  }

  // Viewport model content sits under paper-space annotations / borders.
  return [...viewportContents, ...paperRoots]
}

/**
 * Paints every layout into one PDF document.
 *
 * Pages share the pdf-lib document, the OCG manager (one OCG per CAD layer
 * across pages) and the embedded-image cache. Compared with rendering one
 * PDF per layout and merging via `load`/`copyPages`, this keeps neither
 * finished page bytes nor parsed source documents in memory while later
 * pages are still being built.
 */
async function exportLayoutsToPdf(
  db: AcDbDatabase,
  options: AcPdfExportOptions,
  renderer: AcPdfRenderer,
  layouts: ExportLayoutEntry[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setProducer('MLightCAD pdf-renderer')
  doc.setCreator('MLightCAD')
  if (options.title) {
    doc.setTitle(options.title)
  }
  const ocg = new AcPdfOcgManager(doc)
  const imageCache = new Map<Uint8Array, PDFImage>()
  // One document-scoped Form XObject registry: identical glyph/geometry
  // forms are embedded once per document instead of once per page.
  const formRegistry = createPdfFormRegistry()
  const modelCache: ModelRootCache = {}
  const modelSpaceId = db.tables.blockTable.modelSpace.objectId

  for (const layout of layouts) {
    const block = resolveLayoutBlock(db, layout)
    if (!block) {
      continue
    }
    const isModel = layout.blockTableRecordId === modelSpaceId
    const roots = await collectLayoutRoots(db, renderer, block, modelCache)
    await renderer.renderToDocument(doc, roots, {
      ocg,
      imageCache,
      formRegistry,
      // Model-space “Display” framing must not clip paper-space pages.
      fitBox: isModel ? options.fitBox : undefined
    })
    // Explicit roots were handed to the page; release renderer-side
    // drawables so only the page's pdf-lib objects stay resident.
    renderer.resetCollected()
    // Keep the host busy spinner animating between layout pages.
    await accmYieldForPaint()
  }

  // Flush deferred font embeds and repair their font programs (see
  // AcPdfFontManager.finalize) before serialization.
  await renderer.textFontManager?.finalize()
  const bytes = await doc.save({ useObjectStreams: true })
  return bytes
}
