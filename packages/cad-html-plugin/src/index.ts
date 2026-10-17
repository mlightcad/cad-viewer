/**
 * HTML export plugin and offline HTML format for cad-simple-viewer.
 *
 * Snapshot codecs, packing, and scene-agnostic builders live in
 * `@mlightcad/cad-html-core`. This package adds the cad-simple-viewer plugin,
 * `-chtml` command, and offline viewer runtime.
 *
 * @packageDocumentation
 */

export * from '@mlightcad/cad-html-core'

/**
 * Default filename of the offline HTML viewer IIFE bundle
 * produced by the viewer build target.
 */
export const HTML_VIEWER_RUNTIME_FILE = 'viewer-runtime.iife.js'

export { AcApExportHtmlCmd } from './AcApExportHtmlCmd'
export { AcApHtmlConvertor } from './AcApHtmlConvertor'
export {
  type AcApHtmlExportFormat,
  type AcApHtmlExportOptions,
  ACEX_DEFAULT_CHUNK_SIZE_MIB,
  ACEX_MIN_CHUNK_SIZE_MIB,
  ACEX_MAX_CHUNK_SIZE_MIB,
  acexChunkSizeBytesToMiB,
  acexChunkSizeMiBToBytes,
  captureAcApHtmlViewState,
  clampAcApHtmlChunkSizeMiB,
  resolveAcApHtmlExportOptions,
  resolveAcApHtmlPackageBuildOptions
} from './AcApHtmlExportOptions'
export {
  type AcApHtmlPluginOptions,
  configureHtmlPlugin,
  DEFAULT_HTML_VIEWER_RUNTIME_URL,
  getHtmlPluginOptions,
  resolveViewerRuntimeUrl
} from './AcApHtmlPluginOptions'
export {
  AcApHtmlSnapshotBuilder,
  type AcApHtmlSnapshotBuilderOptions
} from './AcApHtmlSnapshotBuilder'
export { createHtmlPlugin } from './createHtmlPlugin'
export { HTML_PLUGIN_NAME, HTML_PLUGIN_TRIGGERS } from './register'
