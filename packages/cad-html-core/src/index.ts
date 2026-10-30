/**
 * Shared ACEX snapshot / HTML packaging core (no cad-simple-viewer).
 *
 * @packageDocumentation
 */

/** Binary reader/writer used by ACEC / ACEO codecs. */
export * from './AcExBinaryIO'
/** Snapshot schema types, version constant, and geometry batch shapes. */
export * from './AcExSnapshotTypes'
/** Gzip encode and decode for embedded snapshot payloads. */
export * from './AcExSnapshotCompression'
/** Compressed/base85 encode and decode for embedded snapshot payloads. */
export * from './AcExSnapshotCodec'
/** HTML-safe binary text encodings (base85 / legacy base64). */
export * from './AcExHtmlBinaryText'
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
export * from './AcExOsnapPrimitiveToAcGe'
export {
  packHtml,
  packHtmlPackage,
  type AcExPackHtmlOptions,
  type AcExPackHtmlPackageOptions
} from './AcExHtmlPackager'
export {
  ACEX_DEFAULT_MANIFEST_FILE,
  ACEX_DEFAULT_MANIFEST_HREF,
  ACEX_MANIFEST_QUERY_KEYS,
  ACEX_PACKAGE_DIRECTORY_ORIGIN,
  acexGlobalFetch,
  buildPackageDirectoryFileMap,
  canOpenLocalPackageFolder,
  chooseInitialManifestHref,
  createPackageDirectoryFetch,
  detectLocalFolderOpenSupport,
  detectSharedDirectoryRoot,
  findDefaultManifestInDirectory,
  isAbsoluteHttpUrl,
  normalizePackageDirectoryPath,
  probePackageManifest,
  readManifestUrlFromSearchParams,
  resolveViewerManifestUrl,
  type AcExLocalFolderOpenSupport,
  type AcExManifestProbeResult
} from './AcExHtmlPackageBootstrap'
export {
  type AcApHtmlExpiryDays,
  type AcExHtmlAccessManifest,
  ACEX_HTML_EXPIRY_COUNTDOWN_MS,
  acExHtmlBase64ToBytes,
  acExHtmlBytesToBase64,
  buildAcExHtmlAccessManifest,
  createAcExHtmlAccessKey,
  decryptAcExHtmlBytes,
  decryptAcExHtmlSnapshotPayload,
  encryptAcExHtmlBytes,
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
  ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME,
  ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME_BASE64,
  ACEX_EMBEDDED_CHUNK_HREF_ATTR,
  ACEX_EMBEDDED_CHUNK_MIME,
  ACEX_EMBEDDED_CHUNK_MIME_BASE64,
  collectAcExEmbeddedChunkBytes,
  consumeAcExEmbeddedChunkFromDom,
  createAcExDomEmbeddedPackageFetch,
  createAcExEmbeddedPackageFetch,
  decryptAcExEmbeddedManifest,
  estimateAcExSnapshotGeometryBytes,
  packHtmlEmbeddedPackage,
  parseAcExEmbeddedPackageConfig,
  readAcExEmbeddedChunkFromDom,
  shouldEmbedAcExChunks,
  type AcExEmbeddedPackageConfig,
  type AcExPackHtmlEmbeddedOptions
} from './AcExHtmlEmbeddedPackage'
export * from './AcExHtmlI18n'

export {
  ACEX_PACKAGE_VERSION,
  ACEX_DEFAULT_CHUNK_MAX_BYTES,
  ACEX_MAX_GEOMETRY_BATCH_BYTES,
  ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES,
  ACEX_EMBEDDED_CHUNK_THRESHOLD_BYTES,
  ACEX_EMBEDDED_CHUNK_MAX_BYTES,
  ACEX_EMBEDDED_OSNAP_CHUNK_MAX_BYTES,
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
  decodeChunkPayload,
  ACEC_CHUNK_MAGIC,
  type AcExGeometryChunk
} from './AcExChunkBinaryCodec'
export {
  buildAcExPackage,
  buildAcExPackageAsync,
  buildAcExPackageData,
  buildAcExPackageDataAsync,
  splitLayoutIntoSlices,
  type AcExBuildPackageOptions,
  type AcExBuildPackageDataOptions
} from './AcExPackageBuilder'
export {
  ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY,
  createAcExOrderedBytePrefetcher,
  parseAcExPackageManifest,
  snapshotSkeletonFromManifest,
  resolveChunkUrl,
  resolvePackageManifestUrl,
  isSafePackageHref,
  loadAcExPackage,
  loadAcExPackageLayout,
  loadAcExPackageLayoutOsnap,
  type AcExOrderedBytePrefetcher,
  type AcExOrderedPrefetchedItem,
  type AcExPackageLoadProgress,
  type AcExPackageLoaderOptions
} from './AcExPackageLoader'
export {
  encodeOsnapCatalogBinary,
  decodeOsnapCatalogBinary,
  encodeOsnapCatalogGzip,
  decodeOsnapCatalogGzip,
  decodeOsnapCatalogPayload,
  splitOsnapPrimitives,
  estimateOsnapPrimitiveBytes,
  ACEO_OSNAP_MAGIC,
  ACEO_OSNAP_VERSION
} from './AcExOsnapCatalogCodec'
export { zipAcExPackageFiles, unzipAcExPackageFiles } from './AcExPackageZip'
export {
  ACEX_HTML_BACKGROUND_BLACK,
  ACEX_HTML_BACKGROUND_WHITE,
  acExHtmlBackgroundRgb,
  acExHtmlLayoutBackground,
  applyAcExHtmlBackground,
  remapAcExSnapshotForegroundForBackground,
  resolveAcExHtmlBackground,
  type AcExHtmlBackground
} from './AcExHtmlBackground'

export {
  buildSnapshotFromExportScene,
  buildSnapshotFromExportSceneAsync,
  listDatabaseLayouts,
  type AcExBuildSnapshotOptions,
  type AcExDatabaseLayoutInfo,
  type AcExExportLayerMeta,
  type AcExExportLayoutInput,
  type AcExExportLayoutLayerGeometry,
  type AcExExportSceneInput
} from './AcExSnapshotFromSceneData'

export {
  ACEX_HTML_SHELL_CSS,
  buildAcExHtmlShellBody,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_MOBILE_MAX_WIDTH
} from './AcExHtmlShell'
export {
  ACEX_DEFAULT_POLAR_ANGLE,
  ACEX_ORTHO_POLAR_ANGLE,
  ACEX_POLAR_ANGLE_INCREMENTS,
  buildAcExHtmlLocaleStrip,
  buildAcExHtmlPolarAnglesPanel,
  buildAcExHtmlSnapStrip
} from './AcExHtmlShellFragments'
export {
  AcExHtmlIcons,
  acexDropdownItem,
  acexToolbarButton
} from './AcExHtmlIcons'
export * from './AcExDocsUrl'
export * from './AcExLayerExtents'
export { captureAcExSavedViewExtents } from './AcExSavedView'
export * from './AcExBatchBuffers'
export * from './AcExBatchBinaryCodec'
export * from './AcExGeometryBatchSplit'
export * from './AcExExtentCluster'
export * from './AcExMeshTextureExport'
export * from './AcExPatternSnapshot'
export { collectLayoutViewports } from './AcExPaperViewportCollector'
