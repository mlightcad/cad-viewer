/**
 * Headless CAD → offline HTML exporter (Node, no browser / cad-simple-viewer).
 *
 * @packageDocumentation
 */

import { installNodeSnapshotCompressor } from './nodeGzip.js'
import { installNodeRasterCodec } from './nodeRaster.js'

export {
  exportDatabaseToHtml
} from './exportDatabase.js'
export {
  exportFileToHtml
} from './exportFile.js'
export {
  convertDatabaseToSnapshot
} from './convertDatabase.js'
export {
  packSnapshot
} from './packSnapshot.js'
export {
  extractDrawingPreviewJpeg
} from './extractPreviewJpeg.js'
export {
  ensureDwgParserRegistered,
  ensureLibreDwgRegistered
} from './registerDwg.js'
export type {
  AcExDwgParser,
  AcExDwgParserRegisterOptions
} from './registerDwg.js'
export {
  loadViewerRuntime
} from './loadViewerRuntime.js'
export {
  resolveAcExHtmlPackageBuildOptions
} from './exportOptions.js'
export {
  writePackageDirectory
} from './writePackageDirectory.js'
export type {
  AcExHtmlExportFormat,
  AcExHtmlExporterOptions,
  AcExHtmlExportResult
} from './exportOptions.js'

installNodeRasterCodec()
installNodeSnapshotCompressor()
