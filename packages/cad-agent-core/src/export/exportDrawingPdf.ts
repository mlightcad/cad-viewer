import { acexPdfExportDatabase, type AcExPdfFitBox } from '@mlightcad/cad-pdf-core'
import type { CadScriptPdfExportOptions } from '@mlightcad/cad-script-core'
import {
  AcApDocManager,
  AcApFontUtil,
  AcApSettingManager,
  type AcEdBaseView
} from '@mlightcad/cad-simple-viewer'
import type { AcPdfTextFontResolver } from '@mlightcad/pdf-renderer'

/**
 * Viewer-backed PDF export for `cad.file.savePdf`.
 *
 * Uses the live document database, viewer font mapping, and catalog-backed
 * embeddable fonts (same approach as `@mlightcad/cad-pdf-plugin`).
 * When `modelSpaceFit` is `'display'`, frames the live view box.
 */
export async function exportDrawingPdf(
  options: CadScriptPdfExportOptions = {}
): Promise<Uint8Array> {
  const docManager = AcApDocManager.instance
  const doc = docManager?.curDocument
  if (!doc?.database) {
    throw new Error('no_document')
  }
  const modelSpaceFit = options.modelSpaceFit === 'display' ? 'display' : 'extents'
  const displayBox =
    modelSpaceFit === 'display' ? captureFitBox(docManager.curView) : undefined
  return acexPdfExportDatabase(doc.database, {
    exportLayouts: options.exportLayouts,
    colorMode: options.colorMode,
    textMode: options.textMode,
    modelSpaceFit,
    displayBox,
    title: options.title || doc.fileName || doc.docTitle,
    fontMapping: AcApSettingManager.instance.fontMapping,
    textFontResolver: resolveViewerTextFont
  })
}

function captureFitBox(view: AcEdBaseView | undefined): AcExPdfFitBox | undefined {
  if (!view || !(view.width > 0) || !(view.height > 0)) return undefined
  const topLeft = view.screenToWorld({ x: 0, y: 0 })
  const bottomRight = view.screenToWorld({
    x: view.width,
    y: view.height
  })
  return {
    min: {
      x: Math.min(topLeft.x, bottomRight.x),
      y: Math.min(topLeft.y, bottomRight.y)
    },
    max: {
      x: Math.max(topLeft.x, bottomRight.x),
      y: Math.max(topLeft.y, bottomRight.y)
    }
  }
}

/**
 * Resolves embeddable TTF/OTF/WOFF programs from the viewer font catalog.
 * SHX and catalog misses return `undefined` so the PDF renderer paints vectors.
 */
const resolveViewerTextFont: AcPdfTextFontResolver = async fontName => {
  const info = findEmbeddableInfo(fontName)
  if (!info || info.type !== 'mesh' || !info.url) {
    return undefined
  }

  const cached = await AcApFontUtil.getCachedMeshFontProgram(fontName)
  if (cached && cached.byteLength > 0) {
    return cached
  }

  try {
    const res = await fetch(info.url)
    if (!res.ok) return undefined
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength <= 0) return undefined
    const aliases = [fontName, ...(info.name ?? [])].filter(
      (n): n is string => typeof n === 'string' && n.length > 0
    )
    await AcApFontUtil.persistMeshFontProgram(buffer, info.file, aliases)
    return new Uint8Array(buffer)
  } catch {
    return undefined
  }
}

function findEmbeddableInfo(fontName: string) {
  const direct = AcApFontUtil.findFontInfoByName(fontName)
  if (direct) return direct
  const replacement = AcApFontUtil.getReplacementFontName(fontName)
  return replacement && replacement !== fontName
    ? AcApFontUtil.findFontInfoByName(replacement)
    : undefined
}
