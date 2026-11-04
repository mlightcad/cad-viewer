/**
 * Shared ACEX snapshot / HTML packaging core (no cad-simple-viewer).
 *
 * @packageDocumentation
 */

/** Binary reader/writer used by ACEC / ACEO codecs. */
export * from './AcExHtmlBinaryIO'
/** Snapshot schema types, version constant, and geometry batch shapes. */
export * from './AcExHtmlSnapshotTypes'
/** Gzip encode and decode for embedded snapshot payloads. */
export * from './AcExHtmlSnapshotCompression'
/** Compressed/base85 encode and decode for embedded snapshot payloads. */
export * from './AcExHtmlSnapshotCodec'
/** HTML-safe binary text encodings (base85 / legacy base64). */
export * from './AcExHtmlBinaryText'
/** Binary snapshot serialization used by {@link acexHtmlEncodeSnapshot}. */
export {
  acexHtmlDecodeSnapshotBinary,
  acexHtmlEncodeSnapshotBinary
} from './AcExHtmlSnapshotBinaryCodec'
/** THREE.js scene traversal helpers that produce export batches. */
export * from './AcExHtmlSceneBatchCollector'
/** Database metadata extraction for snapshot `meta` fields. */
export * from './AcExHtmlViewerMetadata'
/**
 * Analytic OSNAP primitive types ({@link AcExHtmlOsnapPrimitive}, {@link AcExHtmlOsnapCatalog})
 * and mode definitions for the offline HTML viewer.
 */
export * from './AcExHtmlOsnapPrimitiveTypes'
/**
 * Builds per-layout {@link AcExHtmlOsnapCatalog} from an open `AcDbDatabase`
 * (lines, curves, splines, nested blocks in WCS).
 */
export { acexHtmlBuildOsnapCatalog } from './AcExHtmlOsnapPrimitiveBuilder'
/** Maps snapshot primitives to `AcGe*` curves for OSNAP. */
export * from './AcExHtmlOsnapPrimitiveToAcGe'
export {
  acexHtmlPackHtml,
  acexHtmlPackHtmlPackage,
  type AcExHtmlPackHtmlOptions,
  type AcExHtmlPackHtmlPackageOptions
} from './AcExHtmlPackager'
export {
  ACEX_DEFAULT_MANIFEST_FILE,
  ACEX_DEFAULT_MANIFEST_HREF,
  ACEX_MANIFEST_QUERY_KEYS,
  ACEX_PACKAGE_DIRECTORY_ORIGIN,
  acexHtmlGlobalFetch,
  acexHtmlBuildPackageDirectoryFileMap,
  acexHtmlCanOpenLocalPackageFolder,
  acexHtmlChooseInitialManifestHref,
  acexHtmlCreatePackageDirectoryFetch,
  acexHtmlDetectLocalFolderOpenSupport,
  acexHtmlDetectSharedDirectoryRoot,
  acexHtmlFindDefaultManifestInDirectory,
  acexHtmlIsAbsoluteHttpUrl,
  acexHtmlNormalizePackageDirectoryPath,
  acexHtmlProbePackageManifest,
  acexHtmlReadManifestUrlFromSearchParams,
  acexHtmlResolveViewerManifestUrl,
  type AcExHtmlLocalFolderOpenSupport,
  type AcExHtmlManifestProbeResult
} from './AcExHtmlPackageBootstrap'
export {
  type AcExHtmlExpiryDays,
  type AcExHtmlAccessManifest,
  ACEX_HTML_EXPIRY_COUNTDOWN_MS,
  acexHtmlBase64ToBytes,
  acexHtmlBytesToBase64,
  acexHtmlBuildAccessManifest,
  acexHtmlCreateAccessKey,
  acexHtmlDecryptBytes,
  acexHtmlDecryptSnapshotPayload,
  acexHtmlEncryptBytes,
  acexHtmlEncryptSnapshotPayload,
  acexHtmlFormatCountdown,
  acexHtmlFormatExpiresAt,
  acexHtmlIsAccessExpired,
  acexHtmlIsExpiryCountdownActive,
  acexHtmlNeedsAccessControl,
  acexHtmlParseAccessManifest,
  acexHtmlProtectEncodedSnapshot,
  acexHtmlResolveExpiresAt
} from './AcExHtmlAccess'
export {
  ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME,
  ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME_BASE64,
  ACEX_EMBEDDED_CHUNK_HREF_ATTR,
  ACEX_EMBEDDED_CHUNK_MIME,
  ACEX_EMBEDDED_CHUNK_MIME_BASE64,
  acexHtmlCollectEmbeddedChunkBytes,
  acexHtmlConsumeEmbeddedChunkFromDom,
  acexHtmlCreateDomEmbeddedPackageFetch,
  acexHtmlCreateEmbeddedPackageFetch,
  acexHtmlDecryptEmbeddedManifest,
  acexHtmlEstimateSnapshotGeometryBytes,
  acexHtmlPackHtmlEmbeddedPackage,
  acexHtmlParseEmbeddedPackageConfig,
  acexHtmlReadEmbeddedChunkFromDom,
  acexHtmlShouldEmbedChunks,
  type AcExHtmlEmbeddedPackageConfig,
  type AcExHtmlPackHtmlEmbeddedOptions
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
  type AcExHtmlPackageVersion,
  type AcExHtmlPackageChunkRef,
  type AcExHtmlPackageOsnapChunkRef,
  type AcExHtmlPackageLayoutRef,
  type AcExHtmlPackageManifest,
  type AcExHtmlPackageFile,
  type AcExHtmlPackageFiles
} from './AcExHtmlPackageTypes'
export {
  acexHtmlEncodeChunkBinary,
  acexHtmlDecodeChunkBinary,
  acexHtmlEncodeChunkGzip,
  acexHtmlDecodeChunkGzip,
  acexHtmlDecodeChunkPayload,
  ACEC_CHUNK_MAGIC,
  type AcExHtmlGeometryChunk
} from './AcExHtmlChunkBinaryCodec'
export {
  acexHtmlBuildPackage,
  acexHtmlBuildPackageAsync,
  acexHtmlBuildPackageData,
  acexHtmlBuildPackageDataAsync,
  acexHtmlSplitLayoutIntoSlices,
  type AcExHtmlBuildPackageOptions,
  type AcExHtmlBuildPackageDataOptions
} from './AcExHtmlPackageBuilder'
export {
  ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY,
  acexHtmlCreateOrderedBytePrefetcher,
  acexHtmlParsePackageManifest,
  acexHtmlSnapshotSkeletonFromManifest,
  acexHtmlResolveChunkUrl,
  acexHtmlResolvePackageManifestUrl,
  acexHtmlIsSafePackageHref,
  acexHtmlLoadPackage,
  acexHtmlLoadPackageLayout,
  acexHtmlLoadPackageLayoutOsnap,
  type AcExHtmlOrderedBytePrefetcher,
  type AcExHtmlOrderedPrefetchedItem,
  type AcExHtmlPackageLoadProgress,
  type AcExHtmlPackageLoaderOptions
} from './AcExHtmlPackageLoader'
export {
  acexHtmlEncodeOsnapCatalogBinary,
  acexHtmlDecodeOsnapCatalogBinary,
  acexHtmlEncodeOsnapCatalogGzip,
  acexHtmlDecodeOsnapCatalogGzip,
  acexHtmlDecodeOsnapCatalogPayload,
  acexHtmlSplitOsnapPrimitives,
  acexHtmlEstimateOsnapPrimitiveBytes,
  ACEO_OSNAP_MAGIC,
  ACEO_OSNAP_VERSION
} from './AcExHtmlOsnapCatalogCodec'
export { acexHtmlZipPackageFiles, acexHtmlUnzipPackageFiles } from './AcExHtmlPackageZip'
export {
  ACEX_HTML_BACKGROUND_BLACK,
  ACEX_HTML_BACKGROUND_WHITE,
  acexHtmlBackgroundRgb,
  acexHtmlLayoutBackground,
  acexHtmlApplyBackground,
  acexHtmlRemapSnapshotForegroundForBackground,
  acexHtmlResolveBackground,
  type AcExHtmlBackground
} from './AcExHtmlBackground'

export {
  acexHtmlBuildSnapshotFromExportScene,
  acexHtmlBuildSnapshotFromExportSceneAsync,
  acexHtmlListDatabaseLayouts,
  type AcExHtmlBuildSnapshotOptions,
  type AcExHtmlDatabaseLayoutInfo,
  type AcExHtmlExportLayerMeta,
  type AcExHtmlExportLayoutInput,
  type AcExHtmlExportLayoutLayerGeometry,
  type AcExHtmlExportSceneInput
} from './AcExHtmlSnapshotFromSceneData'

export {
  ACEX_COORDINATE_BADGE_LIFT_EM,
  ACEX_COORDINATE_BADGE_REF_FONT_PX,
  ACEX_HTML_SHELL_CSS,
  acexHtmlBuildShellBody,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_MOBILE_MAX_WIDTH
} from './AcExHtmlShell'
export {
  ACEX_DEFAULT_POLAR_ANGLE,
  ACEX_ORTHO_POLAR_ANGLE,
  ACEX_POLAR_ANGLE_INCREMENTS,
  acexHtmlBuildLocaleStrip,
  acexHtmlBuildPolarAnglesPanel,
  acexHtmlBuildSnapStrip
} from './AcExHtmlShellFragments'
export {
  AcExHtmlIcons,
  acexHtmlDropdownItem,
  acexHtmlToolbarButton
} from './AcExHtmlIcons'
export * from './AcExHtmlDocsUrl'
export * from './AcExHtmlLayerExtents'
export { acexHtmlCaptureSavedViewExtents } from './AcExHtmlSavedView'
export * from './AcExHtmlBatchBuffers'
export * from './AcExHtmlBatchBinaryCodec'
export * from './AcExHtmlGeometryBatchSplit'
export * from './AcExHtmlExtentCluster'
export * from './AcExHtmlMeshTextureExport'
export * from './AcExHtmlPatternSnapshot'
export { acexHtmlCollectLayoutViewports } from './AcExHtmlPaperViewportCollector'
