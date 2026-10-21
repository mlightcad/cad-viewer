/**
 * Headless CAD → offline HTML exporter (Node, no browser / cad-simple-viewer).
 *
 * @packageDocumentation
 */

import { installNodeSnapshotCompressor } from './nodeGzip'

export {
  exportDatabaseToHtml
} from './exportDatabase'
export {
  exportFileToHtml
} from './exportFile'
export {
  convertDatabaseToSnapshot
} from './convertDatabase'
export {
  packSnapshot
} from './packSnapshot'
export {
  extractDrawingPreviewJpeg
} from './extractPreviewJpeg'
export {
  ensureDwgParserRegistered,
  ensureLibreDwgRegistered
} from './registerDwg'
export type {
  AcExDwgParser,
  AcExDwgParserRegisterOptions
} from './registerDwg'
export {
  loadViewerRuntime
} from './loadViewerRuntime'
export {
  resolveAcExHtmlPackageBuildOptions
} from './exportOptions'
export {
  writePackageDirectory
} from './writePackageDirectory'
export type {
  AcExHtmlExportFormat,
  AcExHtmlExporterOptions,
  AcExHtmlExportResult
} from './exportOptions'

installNodeSnapshotCompressor()
