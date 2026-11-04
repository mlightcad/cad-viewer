import { AcApHtmlConvertor } from '@mlightcad/cad-html-plugin'
import type {
  CadScriptHtmlExportOptions,
  CadScriptHtmlExportResult
} from '@mlightcad/cad-script-core'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

/**
 * Viewer-backed HTML export for `cad.file.saveHtml`.
 *
 * Builds an offline snapshot from the live Three.js scene via
 * `@mlightcad/cad-html-plugin` and returns bytes (no browser download).
 */
export async function exportDrawingHtml(
  options: CadScriptHtmlExportOptions = {}
): Promise<CadScriptHtmlExportResult> {
  const doc = AcApDocManager.instance?.curDocument
  if (!doc) {
    throw new Error('no_document')
  }
  const convertor = new AcApHtmlConvertor()
  const result = await convertor.exportToResult(
    options.title || doc.fileName || doc.docTitle,
    {
      exportFormat: options.exportFormat,
      exportLayouts: options.exportLayouts,
      background: options.background
    }
  )
  return {
    fileName: result.fileName,
    bytes: result.bytes,
    mediaType: result.mediaType
  }
}
