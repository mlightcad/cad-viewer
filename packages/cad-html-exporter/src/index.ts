/** Snapshot schema types, version constant, and geometry batch shapes. */
export * from './AcExSnapshotTypes'
/** Gzip/base64 encode and decode for embedded snapshot payloads. */
export * from './AcExSnapshotCodec'
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
export { packHtml, type AcExPackHtmlOptions } from './AcExHtmlPackager'
export {
  AcExHtmlI18n,
  type AcExHtmlLocale,
  type AcExHtmlMessageKey,
  detectAcExHtmlLocale,
  resolveAcExHtmlLocale
} from './AcExHtmlI18n'

/**
 * Default filename of the offline HTML viewer IIFE bundle
 * produced by the `cad-html-exporter` viewer build target.
 */
export const HTML_VIEWER_RUNTIME_FILE = 'viewer-runtime.iife.js'
