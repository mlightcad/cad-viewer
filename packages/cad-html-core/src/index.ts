/**
 * Shared ACEX snapshot / HTML packaging core (no cad-simple-viewer).
 *
 * @packageDocumentation
 */

/** Binary reader/writer used by ACEC / ACEO codecs. */
export * from './AcExHtmlBinaryIO.js'
/** Snapshot schema types, version constant, and geometry batch shapes. */
export * from './AcExHtmlSnapshotTypes.js'
/** Gzip encode and decode for embedded snapshot payloads. */
export * from './AcExHtmlSnapshotCompression.js'
/** Compressed/base85 encode and decode for embedded snapshot payloads. */
export * from './AcExHtmlSnapshotCodec.js'
/** HTML-safe binary text encodings (base85 / legacy base64). */
export * from './AcExHtmlBinaryText.js'
/** Binary snapshot serialization used by {@link acexHtmlEncodeSnapshot}. */
export {
  acexHtmlDecodeSnapshotBinary,
  acexHtmlEncodeSnapshotBinary
} from './AcExHtmlSnapshotBinaryCodec.js'
/** THREE.js scene traversal helpers that produce export batches. */
export * from './AcExHtmlSceneBatchCollector.js'
/** Database metadata extraction for snapshot `meta` fields. */
export * from './AcExHtmlViewerMetadata.js'
/**
 * Analytic OSNAP primitive types ({@link AcExHtmlOsnapPrimitive}, {@link AcExHtmlOsnapCatalog})
 * and mode definitions for the offline HTML viewer.
 */
export * from './AcExHtmlOsnapPrimitiveTypes.js'
/**
 * Builds per-layout {@link AcExHtmlOsnapCatalog} from an open `AcDbDatabase`
 * (lines, curves, splines, nested blocks in WCS).
 */
export { acexHtmlBuildOsnapCatalog } from './AcExHtmlOsnapPrimitiveBuilder.js'
/** Maps snapshot primitives to `AcGe*` curves for OSNAP. */
export * from './AcExHtmlOsnapPrimitiveToAcGe.js'
export {
  acexHtmlPackHtml,
  acexHtmlPackHtmlPackage,
  type AcExHtmlPackHtmlOptions,
  type AcExHtmlPackHtmlPackageOptions
} from './AcExHtmlPackager.js'
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
} from './AcExHtmlPackageBootstrap.js'
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
} from './AcExHtmlAccess.js'
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
} from './AcExHtmlEmbeddedPackage.js'
export * from './AcExHtmlI18n.js'

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
} from './AcExHtmlPackageTypes.js'
export {
  acexHtmlEncodeChunkBinary,
  acexHtmlDecodeChunkBinary,
  acexHtmlEncodeChunkGzip,
  acexHtmlDecodeChunkGzip,
  acexHtmlDecodeChunkPayload,
  ACEC_CHUNK_MAGIC,
  type AcExHtmlGeometryChunk
} from './AcExHtmlChunkBinaryCodec.js'
export {
  acexHtmlBuildPackage,
  acexHtmlBuildPackageAsync,
  acexHtmlBuildPackageData,
  acexHtmlBuildPackageDataAsync,
  acexHtmlSplitLayoutIntoSlices,
  type AcExHtmlBuildPackageOptions,
  type AcExHtmlBuildPackageDataOptions
} from './AcExHtmlPackageBuilder.js'
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
} from './AcExHtmlPackageLoader.js'
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
} from './AcExHtmlOsnapCatalogCodec.js'
export { acexHtmlZipPackageFiles, acexHtmlUnzipPackageFiles } from './AcExHtmlPackageZip.js'
export {
  ACEX_HTML_BACKGROUND_BLACK,
  ACEX_HTML_BACKGROUND_WHITE,
  acexHtmlBackgroundRgb,
  acexHtmlLayoutBackground,
  acexHtmlApplyBackground,
  acexHtmlRemapSnapshotForegroundForBackground,
  acexHtmlResolveBackground,
  type AcExHtmlBackground
} from './AcExHtmlBackground.js'

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
} from './AcExHtmlSnapshotFromSceneData.js'
export { acexHtmlIsEmptyPaperSpaceLayout } from './AcExHtmlEmptyLayout.js'

export {
  ACEX_COORDINATE_BADGE_LIFT_EM,
  ACEX_COORDINATE_BADGE_REF_FONT_PX,
  ACEX_HTML_SHELL_CSS,
  acexHtmlBuildShellBody,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_MOBILE_MAX_WIDTH
} from './AcExHtmlShell.js'
export {
  ACEX_DEFAULT_POLAR_ANGLE,
  ACEX_ORTHO_POLAR_ANGLE,
  ACEX_POLAR_ANGLE_INCREMENTS,
  acexHtmlBuildLocaleStrip,
  acexHtmlBuildPolarAnglesPanel,
  acexHtmlBuildSnapStrip
} from './AcExHtmlShellFragments.js'
export {
  AcExHtmlIcons,
  acexHtmlDropdownItem,
  acexHtmlToolbarButton
} from './AcExHtmlIcons.js'
export * from './AcExHtmlDocsUrl.js'
export * from './AcExHtmlLayerExtents.js'
export { acexHtmlCaptureSavedViewExtents } from './AcExHtmlSavedView.js'
export * from './AcExHtmlBatchBuffers.js'
export * from './AcExHtmlBatchBinaryCodec.js'
export * from './AcExHtmlGeometryBatchSplit.js'
export * from './AcExHtmlExtentCluster.js'
export * from './AcExHtmlMeshTextureExport.js'
export * from './AcExHtmlPatternSnapshot.js'
export { acexHtmlCollectLayoutViewports } from './AcExHtmlPaperViewportCollector.js'
