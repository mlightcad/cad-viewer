/**
 * Viewer binding for the CAD agent runtime.
 *
 * The script runtime lives in `@mlightcad/cad-script-core`. This package binds
 * it to `@mlightcad/cad-simple-viewer` (live document, selection highlight,
 * zoom, screenshots, PDF/HTML export hooks, undo notifications) and re-exports
 * the runtime API, so existing imports keep working.
 *
 * Chat, MCP, and WebMCP adapters depend on this package. It does not depend
 * on a model SDK or a UI framework.
 *
 * @packageDocumentation
 */

// Runtime API that needs no viewer, re-exported unchanged.
export {
  type CadEditTransaction,
  type CadMeasureApi,
  type CadScriptDxfSaveOptions,
  type CadScriptDxfSaveRequest,
  type CadScriptEffects,
  type CadScriptHtmlExportOptions,
  type CadScriptHtmlExportResult,
  type CadScriptHtmlSaveOptions,
  type CadScriptHtmlSaveRequest,
  type CadScriptLimits,
  type CadScriptPdfExportOptions,
  type CadScriptPdfSaveOptions,
  type CadScriptPdfSaveRequest,
  type CadScriptPreviewRequest,
  type CadScriptRunOptions,
  type CadScriptValidation,
  type CadSession,
  type CadSessionDocument,
  type CadSessionLayerInfo,
  CadSessionOpenMode,
  type CadSessionView,
  type CadToolAccess,
  type CadToolCatalogOptions,
  type CadToolDefinition,
  CAD_EDIT_TX_METHODS,
  CAD_MCP_DXF_OUTBOX_KEY,
  CAD_MCP_FILE_OUTBOX_KEY,
  CAD_SCRIPT_API_SUMMARY,
  CAD_SCRIPT_API_TREE,
  type CaptureDrawingPreviewFailure,
  type CaptureDrawingPreviewResult,
  createCadMeasure,
  createDatabaseSession,
  type CreateDatabaseSessionOptions,
  DRAWING_PREVIEW_LONG_SIDE_PX,
  type DrawingContextSnapshot,
  type EntitySnapshot,
  getDrawingContext,
  instrumentCadScript,
  isEntityOnLockedLayer,
  MAX_SCRIPT_RESULT_CHARS,
  MAX_SCRIPT_SOURCE_CHARS,
  type MeasureCheck,
  type MeasureReport,
  normalizeDxfSaveRequest,
  normalizeHtmlSaveRequest,
  normalizePdfSaveRequest,
  type Point2dInput,
  requireDocument,
  requireView,
  runSessionEdit,
  toEntitySnapshot,
  type ToolResult,
  type ToolResultImage,
  type ToolResultSavedFile,
  validateCadScript,
  VERIFICATION_PREVIEW_LONG_SIDE_PX
} from '@mlightcad/cad-script-core'

export { exportDrawingHtml } from './export/exportDrawingHtml'
export { exportDrawingPdf } from './export/exportDrawingPdf'

// Viewer bindings.
export {
  captureDrawingPreview,
  waitForDrawingSceneReady
} from './preview/captureDrawingPreview'
export { createDocManagerSession } from './session/createDocManagerSession'
export { viewerRunEdit, withViewerDefaults } from './session/withViewerDefaults'
export {
  CadActionExecutor,
  createCadScriptHost,
  createCadToolCatalog,
  executeCadScript
} from './tools/viewerBindings'
