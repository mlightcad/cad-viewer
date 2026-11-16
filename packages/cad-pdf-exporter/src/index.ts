/**
 * Headless CAD → PDF exporter (Node, no browser / cad-simple-viewer).
 *
 * @packageDocumentation
 */

export { convertDatabaseToPdf } from './convertDatabase.js'
export { exportFileToPdf } from './exportFile.js'
export type { AcPdfExporterOptions, AcPdfExportResult } from './exportOptions.js'
export {
  createNodeTextFontResolver,
  DEFAULT_EXPORT_FONTS_URL,
  type NodeFontLibrary,
  resolveLocalFontRoot,
  setupExportTextRendering
} from './nodeFontLoader.js'
export {
  type AcExDwgParser,
  type AcExDwgParserRegisterOptions,
  ensureDwgParserRegistered,
  ensureLibreDwgRegistered
} from './registerDwg.js'
export {
  type AcExPdfColorMode,
  type AcExPdfExportOptions,
  acexPdfResolveExportOptions,
  type AcExPdfTextMode
} from '@mlightcad/cad-pdf-core'
