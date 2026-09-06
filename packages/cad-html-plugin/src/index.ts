/**
 * HTML export plugin and offline HTML format for cad-simple-viewer.
 *
 * @packageDocumentation
 */

/** Snapshot schema types, version constant, and geometry batch shapes. */
export * from './AcExSnapshotTypes'
/** Gzip encode and decode for embedded snapshot payloads. */
export * from './AcExSnapshotCompression'
/** Compressed/base64 encode and decode for embedded snapshot payloads. */
export * from './AcExSnapshotCodec'
/** Binary snapshot serialization used by {@link encodeSnapshot}. */
export {
  decodeSnapshotBinary,
  encodeSnapshotBinary
} from './AcExSnapshotBinaryCodec'
/** THREE.js scene traversal helpers that produce export batches. */
export * from './AcExSceneBatchCollector'
/** Database metadata extraction for snapshot `meta` fields. */
export * from './AcExViewerMetadata'
/**
 * Analytic OSNAP primitive types ({@link AcExOsnapPrimitive}, {@link AcExOsnapCatalog})
 * and mode definitions for the offline HTML viewer.
 */
export * from './AcExOsnapPrimitiveTypes'
/**
 * Builds per-layout {@link AcExOsnapCatalog} from an open `AcDbDatabase`
 * (lines, curves, splines, nested blocks in WCS).
 */
export { buildOsnapCatalog } from './AcExOsnapPrimitiveBuilder'
/** Maps snapshot primitives to `AcGe*` curves for OSNAP. */
export {
  circleOrArcToAcGe,
  ellipseToAcGe,
  primitiveToAcGeCurve,
  splineToAcGe,
  type AcExOsnapAcGeCurve
} from './AcExOsnapPrimitiveToAcGe'
export { packHtml, packHtmlPackage, type AcExPackHtmlOptions, type AcExPackHtmlPackageOptions } from './AcExHtmlPackager'
export {
  type AcApHtmlExpiryDays,
  type AcExHtmlAccessManifest,
  ACEX_HTML_EXPIRY_COUNTDOWN_MS,
  buildAcExHtmlAccessManifest,
  decryptAcExHtmlSnapshotPayload,
  encryptAcExHtmlSnapshotPayload,
  formatAcExHtmlCountdown,
  formatAcExHtmlExpiresAt,
  isAcExHtmlAccessExpired,
  isAcExHtmlExpiryCountdownActive,
  needsAcExHtmlAccessControl,
  parseAcExHtmlAccessManifest,
  protectAcExHtmlEncodedSnapshot,
  resolveAcApHtmlExpiresAt
} from './AcExHtmlAccess'
export {
  AcExHtmlI18n,
  type AcExHtmlLocale,
  type AcExHtmlMessageKey,
  detectAcExHtmlLocale,
  detectBrowserAcExHtmlLocale,
  resolveAcExHtmlLocale
} from './AcExHtmlI18n'

export {
  ACEX_PACKAGE_VERSION,
  ACEX_DEFAULT_CHUNK_MAX_BYTES,
  ACEX_MAX_GEOMETRY_BATCH_BYTES,
  ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES,
  type AcExPackageVersion,
  type AcExPackageChunkRef,
  type AcExPackageOsnapChunkRef,
  type AcExPackageLayoutRef,
  type AcExPackageManifest,
  type AcExPackageFile,
  type AcExPackageFiles
} from './AcExPackageTypes'
export {
  encodeChunkBinary,
  decodeChunkBinary,
  encodeChunkGzip,
  decodeChunkGzip,
  ACEC_CHUNK_MAGIC,
  type AcExGeometryChunk
} from './AcExChunkBinaryCodec'
export {
  buildAcExPackage,
  splitLayoutIntoSlices,
  type AcExBuildPackageOptions
} from './AcExPackageBuilder'
export {
  parseAcExPackageManifest,
  snapshotSkeletonFromManifest,
  resolveChunkUrl,
  resolvePackageManifestUrl,
  isSafePackageHref,
  loadAcExPackage,
  loadAcExPackageLayout,
  loadAcExPackageLayoutOsnap,
  type AcExPackageLoadProgress,
  type AcExPackageLoaderOptions
} from './AcExPackageLoader'
export {
  encodeOsnapCatalogBinary,
  decodeOsnapCatalogBinary,
  encodeOsnapCatalogGzip,
  decodeOsnapCatalogGzip,
  splitOsnapPrimitives,
  estimateOsnapPrimitiveBytes,
  ACEO_OSNAP_MAGIC,
  ACEO_OSNAP_VERSION
} from './AcExOsnapCatalogCodec'
export { zipAcExPackageFiles, unzipAcExPackageFiles } from './AcExPackageZip'

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
  captureAcApHtmlViewState,
  resolveAcApHtmlExportOptions
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
  listDatabaseLayouts,
  type AcApHtmlSnapshotBuilderOptions
} from './AcApHtmlSnapshotBuilder'
export { createHtmlPlugin } from './createHtmlPlugin'
export { HTML_PLUGIN_NAME, HTML_PLUGIN_TRIGGERS } from './register'
