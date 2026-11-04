/**
 * Headless CAD → PDF exporter (Node, no browser / cad-simple-viewer).
 *
 * @packageDocumentation
 */

export { convertDatabaseToPdf } from './convertDatabase'
export { exportFileToPdf } from './exportFile'
export type { AcPdfExporterOptions, AcPdfExportResult } from './exportOptions'
export {
  createNodeTextFontResolver,
  DEFAULT_EXPORT_FONTS_URL,
  type NodeFontLibrary,
  resolveLocalFontRoot,
  setupExportTextRendering
} from './nodeFontLoader'
export {
  type AcExDwgParser,
  type AcExDwgParserRegisterOptions,
  ensureDwgParserRegistered,
  ensureLibreDwgRegistered
} from './registerDwg'
export {
  type AcExPdfColorMode,
  type AcExPdfExportOptions,
  acexPdfResolveExportOptions,
  type AcExPdfTextMode
} from '@mlightcad/cad-pdf-core'
