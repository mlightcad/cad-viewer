import {
  accmYieldForPaint,
  AcDbDatabase,
  AcDbRenderingCache,
  AcDbViewport,
  acgiIsLightBackground
} from '@mlightcad/data-model'
import {
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFPage,
  PDFRef,
  PDFString
} from 'pdf-lib'

import type { AcPdfExportOptions } from './AcPdfExportOptions'
import { AcPdfEntity } from './renderer/AcPdfEntity'
import { AcPdfRenderer } from './renderer/AcPdfRenderer'
import {
  attachPdfEntityMeta,
  buildViewportModelContent,
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
  if (options.layouts === 'all' && !options.blockName && !options.blockId) {
    const pages = await exportAllLayouts(db, options)
    if (pages) {
      return pages
    }
  }

  AcPdfRenderer.prepareExport()

  const renderer = new AcPdfRenderer()
  renderer.insunits = db.insunits ?? 4
  renderer.ltscale = options.ltscale ?? db.ltscale
  renderer.celtscale = options.celtscale ?? db.celtscale
  renderer.showLineWeight = options.showLineWeight ?? !!db.lwdisplay
  renderer.configureExport(options)

  const background =
    options.background === 'none' || options.background == null
      ? 0xffffff
      : options.background
  renderer.currentBackgroundColor = background
  renderer.changeForeground(acgiIsLightBackground(background) ? 0x000000 : 0xffffff)

  const block = options.blockId
    ? db.tables.blockTable.getIdAt(options.blockId)
    : options.blockName
      ? db.tables.blockTable.getAt(options.blockName)
      : (db.tables.blockTable.getIdAt(db.currentSpaceId) ??
        db.tables.blockTable.modelSpace)
  if (!block) {
    throw new Error(
      `Block '${options.blockName}' was not found in the drawing database`
    )
  }

  renderer.context.database = db
  const isPaper = isPaperSpaceBlock(db, block)
  const viewportEntities: AcDbViewport[] = []
  const paperOrModelRoots: AcPdfEntity[] = []

  for (const entity of block.newIterator()) {
    const typeName = String(
      (entity as { type?: string }).type ??
        (entity as { dxfTypeName?: string }).dxfTypeName ??
        ''
    )

    if (isPaper && entity instanceof AcDbViewport) {
      viewportEntities.push(entity)
      continue
    }

    const drawable = entity.worldDraw(renderer)
    if (drawable instanceof AcPdfEntity) {
      attachPdfEntityMeta(drawable, entity, typeName)
      paperOrModelRoots.push(drawable)
    }
  }

  const viewportContents: AcPdfEntity[] = []
  if (isPaper && viewportEntities.length > 0) {
    // Collect model geometry, wait for async TEXT/MTEXT glyphs, then clone
    // into each viewport. Cloning before awaitPending left empty text ops.
    const modelRoots = collectModelSpaceRoots(db, renderer)
    await renderer.awaitPending()
    for (const viewport of viewportEntities) {
      const built = buildViewportModelContent(viewport, modelRoots, renderer)
      if (built) {
        viewportContents.push(built.content)
        if (built.border) {
          paperOrModelRoots.push(built.border)
        }
      }
    }
  }

  // Viewport model content sits under paper-space annotations / borders.
  const roots = isPaper
    ? [...viewportContents, ...paperOrModelRoots]
    : paperOrModelRoots

  try {
    return await renderer.exportAsync(roots)
  } finally {
    AcDbRenderingCache.instance.clear()
  }
}

async function exportAllLayouts(
  db: AcDbDatabase,
  options: AcPdfExportOptions
): Promise<Uint8Array | null> {
  const layoutTable = (
    db as {
      objects?: {
        layout?: {
          newIterator?: () => Iterable<{
            layoutName?: string
            blockTableRecordId: string
            tabOrder?: number
          }>
        }
      }
    }
  ).objects?.layout
  if (!layoutTable?.newIterator) {
    return null
  }
  const layouts = [...layoutTable.newIterator()]
    .filter(layout => !!layout.blockTableRecordId)
    .sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0))
  if (layouts.length <= 1) {
    return null
  }
  const pages: Uint8Array[] = []
  const modelSpaceId = db.tables.blockTable.modelSpace.objectId
  for (const layout of layouts) {
    const isModel = layout.blockTableRecordId === modelSpaceId
    pages.push(
      await exportDatabaseToPdf(db, {
        ...options,
        layouts: 'current',
        blockId: layout.blockTableRecordId,
        // Model-space “Display” framing must not clip paper-space pages.
        fitBox: isModel ? options.fitBox : undefined,
        fit: isModel ? options.fit : 'extents',
        title: options.title
          ? `${options.title} - ${layout.layoutName ?? ''}`
          : layout.layoutName
      })
    )
    // Keep the host busy spinner animating between layout pages.
    await accmYieldForPaint()
  }
  return mergePdfPages(pages)
}

async function mergePdfPages(pages: Uint8Array[]): Promise<Uint8Array> {
  if (pages.length === 1) {
    return pages[0]
  }
  const out = await PDFDocument.create()
  for (const bytes of pages) {
    const src = await PDFDocument.load(bytes)
    const copied = await out.copyPages(src, src.getPageIndices())
    for (const page of copied) {
      out.addPage(page)
    }
  }
  // copyPages keeps page Resources.Properties → OCG refs, but not Catalog
  // OCProperties — without it, viewers hide the Layers panel.
  rebuildMergedOcProperties(out)
  out.setProducer('MLightCAD pdf-renderer')
  return out.save({ useObjectStreams: true })
}

/**
 * Rebuilds Catalog.OCProperties after merging layout pages, and collapses
 * duplicate OCG dicts that share the same display name across pages.
 */
function rebuildMergedOcProperties(doc: PDFDocument) {
  const nameToRef = new Map<string, PDFRef>()
  for (const page of doc.getPages()) {
    mergePageOcgs(page, nameToRef)
  }
  if (nameToRef.size === 0) {
    return
  }
  const ocgRefs = [...nameToRef.values()]
  const order = doc.context.obj(ocgRefs)
  const ocProperties = doc.context.obj({
    OCGs: ocgRefs,
    D: {
      Order: order,
      ON: ocgRefs
    }
  })
  doc.catalog.set(PDFName.of('OCProperties'), ocProperties)
}

function mergePageOcgs(page: PDFPage, nameToRef: Map<string, PDFRef>) {
  const resources = page.node.Resources()
  if (!resources) {
    return
  }
  const props = resources.lookup(PDFName.of('Properties'))
  if (!(props instanceof PDFDict)) {
    return
  }
  for (const [key, value] of props.entries()) {
    if (!(value instanceof PDFRef)) {
      continue
    }
    const ocgDict = page.doc.context.lookup(value)
    if (!(ocgDict instanceof PDFDict)) {
      continue
    }
    const type = ocgDict.get(PDFName.of('Type'))
    if (type !== PDFName.of('OCG')) {
      continue
    }
    const label = decodeOcgName(ocgDict.get(PDFName.of('Name')))
    const existing = nameToRef.get(label)
    if (existing) {
      // Point this page at the canonical OCG so the Layers panel has one entry.
      props.set(key, existing)
    } else {
      nameToRef.set(label, value)
    }
  }
}

function decodeOcgName(nameObj: unknown): string {
  if (nameObj instanceof PDFHexString || nameObj instanceof PDFString) {
    return nameObj.decodeText()
  }
  return String(nameObj ?? '')
}
