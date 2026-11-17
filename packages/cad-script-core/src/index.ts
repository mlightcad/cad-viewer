/**
 * CAD script runtime for agent scripts (`cad.*`).
 *
 * Depends on `@mlightcad/data-model` plus `@mlightcad/cad-pdf-core` for
 * `cad.file.savePdf`. HTML export (`cad.file.saveHtml`) is fulfilled through
 * an optional {@link CadSession.exportHtml} hook — typically provided by
 * `@mlightcad/cad-agent-core` in a viewer host. This package does not depend
 * on `cad-simple-viewer`, a UI framework, or a model SDK.
 *
 * Use {@link createDatabaseSession} to run scripts on a bare `AcDbDatabase`.
 * In the browser, `@mlightcad/cad-agent-core` provides a session bound to the
 * live viewer (selection highlight, zoom, screenshots, HTML export, undo).
 *
 * @packageDocumentation
 */

export {
  getDrawingContext,
  type DrawingContextSnapshot
} from './context/DrawingContextProvider.js'
export {
  type CadCapturePreviewOptions,
  type CaptureDrawingPreviewFailure,
  type CaptureDrawingPreviewResult,
  DRAWING_PREVIEW_LONG_SIDE_PX,
  type NormalizedCadCapturePreviewOptions,
  normalizeCadCapturePreviewOptions,
  VERIFICATION_PREVIEW_LONG_SIDE_PX
} from './preview/types.js'
export {
  createCadMeasure,
  type CadMeasureApi,
  type MeasureCheck,
  type MeasureReport
} from './script/createCadMeasure.js'
export {
  acexRedrawPoint,
  acexRedrawResolveCalibration,
  type RedrawPointTransform,
  type RedrawResolvedCalibration
} from './redraw/calibration.js'
export {
  type CadRedrawApi,
  type CadRedrawDeps,
  createCadRedraw,
  REDRAW_DEFAULT_LAYERS,
  type RedrawCheckResult,
  type RedrawDrawOptions,
  type RedrawDrawResult,
  type RedrawInspectionResult
} from './redraw/createCadRedraw.js'
export {
  acexRunRedrawCompare,
  type RedrawCompareImage,
  type RedrawCompareOptions,
  type RedrawCompareRequest,
  type RedrawCompareResult
} from './redraw/compareRedraw.js'
export {
  acexCompareInk,
  acexCreateRaster,
  acexDistanceTransform,
  acexDownscaleRaster,
  acexExtractInk,
  acexRenderDifference,
  acexRenderOverlay,
  acexThinInk,
  acexWarpRenderedInk,
  type CadRasterImage,
  type CompareHotspot,
  type CompareMetrics,
  type InkCompareOptions,
  type InkComparison,
  type InkMask,
  type InkOptions,
  type PixelToCad,
  type RenderedDrawing
} from './redraw/pixelCompare.js'
export type { CadRedrawRasterHost } from './redraw/rasterHost.js'
export * from './redraw/types.js'
export {
  acexRedrawStatus,
  acexRedrawValidateSpec,
  MAX_REDRAW_ENTITIES,
  REDRAW_PROFILES,
  REDRAW_UNITS,
  type RedrawEvidenceSummary,
  type RedrawValidationContext,
  type RedrawValidationResult
} from './redraw/validateRedrawSpec.js'
export {
  createCadScriptHost,
  type CadEditTransaction,
  type CadScriptEffects,
  type CadScriptLimits,
  type CadScriptPreviewRequest
} from './script/createCadScriptHost.js'
export {
  normalizeDxfSaveRequest,
  type CadScriptDxfSaveOptions,
  type CadScriptDxfSaveRequest
} from './script/saveDxf.js'
export {
  fulfillHtmlSaveRequests,
  normalizeHtmlSaveRequest,
  type CadScriptHtmlExportOptions,
  type CadScriptHtmlExportResult,
  type CadScriptHtmlSaveOptions,
  type CadScriptHtmlSaveRequest
} from './script/saveHtml.js'
export {
  fulfillPdfSaveRequests,
  normalizePdfSaveRequest,
  type CadScriptPdfExportOptions,
  type CadScriptPdfSaveOptions,
  type CadScriptPdfSaveRequest
} from './script/savePdf.js'
export {
  toEntitySnapshot,
  type EntitySnapshot
} from './script/entitySnapshot.js'
export {
  executeCadScript,
  MAX_SCRIPT_RESULT_CHARS,
  type CadScriptRunOptions
} from './script/executeCadScript.js'
export { instrumentCadScript } from './script/instrumentCadScript.js'
export {
  CAD_EDIT_TX_METHODS,
  CAD_MCP_DXF_OUTBOX_KEY,
  CAD_MCP_FILE_OUTBOX_KEY,
  CAD_REDRAW_SPEC_SUMMARY,
  CAD_SCRIPT_API_SUMMARY,
  CAD_SCRIPT_API_TREE
} from './script/scriptApi.js'
export {
  MAX_SCRIPT_SOURCE_CHARS,
  validateCadScript,
  type CadScriptValidation
} from './script/validateCadScript.js'
export {
  type CadSession,
  type CadSessionDocument,
  type CadSessionLayerInfo,
  CadSessionOpenMode,
  type CadSessionView
} from './session/CadSession.js'
export {
  createDatabaseSession,
  type CreateDatabaseSessionOptions
} from './session/createDatabaseSession.js'
export { requireDocument, requireView } from './session/documentAccess.js'
export { isEntityOnLockedLayer } from './session/lockedLayer.js'
export { runSessionEdit } from './session/runSessionEdit.js'
export { CadActionExecutor } from './tools/CadActionExecutor.js'
export {
  createCadToolCatalog,
  type CadToolCatalogOptions
} from './tools/createCadToolCatalog.js'
export {
  type CadToolAccess,
  type CadToolDefinition,
  type Point2dInput,
  type ToolResult,
  type ToolResultImage,
  type ToolResultSavedFile
} from './tools/types.js'
