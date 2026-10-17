/**
 * Re-exports direct-batch helpers from `@mlightcad/three-renderer`.
 *
 * Implementation lives in three-renderer so headless HTML export can share
 * the same capture path without depending on cad-simple-viewer.
 */
export {
  isDirectBatchCandidate,
  shouldExtendBboxForDirectEntity,
  tryBuildDirectEntityMeta
} from '@mlightcad/three-renderer'
