/**
 * CAD script runtime that depends only on `@mlightcad/data-model`.
 *
 * Validates, sandboxes, and runs agent scripts (`cad.*`) against a
 * {@link CadSession}, and builds the transport-agnostic tool catalog. It does
 * not depend on a viewer, a renderer, a UI framework, or a model SDK.
 *
 * Use {@link createDatabaseSession} to run scripts on a bare `AcDbDatabase`.
 * In the browser, `@mlightcad/cad-agent-core` provides a session bound to the
 * live viewer (selection highlight, zoom, screenshots, undo notifications).
 *
 * @packageDocumentation
 */

export {
  getDrawingContext,
  type DrawingContextSnapshot
} from './context/DrawingContextProvider'
export {
  type CaptureDrawingPreviewFailure,
  type CaptureDrawingPreviewResult,
  DRAWING_PREVIEW_LONG_SIDE_PX,
  VERIFICATION_PREVIEW_LONG_SIDE_PX
} from './preview/types'
export {
  createCadMeasure,
  type CadMeasureApi,
  type MeasureCheck,
  type MeasureReport
} from './script/createCadMeasure'
export {
  createCadScriptHost,
  type CadEditTransaction,
  type CadScriptEffects,
  type CadScriptLimits,
  type CadScriptPreviewRequest
} from './script/createCadScriptHost'
export {
  normalizeDxfSaveRequest,
  type CadScriptDxfSaveOptions,
  type CadScriptDxfSaveRequest
} from './script/saveDxf'
export { toEntitySnapshot, type EntitySnapshot } from './script/entitySnapshot'
export {
  executeCadScript,
  MAX_SCRIPT_RESULT_CHARS,
  type CadScriptRunOptions
} from './script/executeCadScript'
export { instrumentCadScript } from './script/instrumentCadScript'
export {
  CAD_EDIT_TX_METHODS,
  CAD_MCP_DXF_OUTBOX_KEY,
  CAD_SCRIPT_API_SUMMARY,
  CAD_SCRIPT_API_TREE
} from './script/scriptApi'
export {
  MAX_SCRIPT_SOURCE_CHARS,
  validateCadScript,
  type CadScriptValidation
} from './script/validateCadScript'
export {
  type CadSession,
  type CadSessionDocument,
  type CadSessionLayerInfo,
  CadSessionOpenMode,
  type CadSessionView
} from './session/CadSession'
export {
  createDatabaseSession,
  type CreateDatabaseSessionOptions
} from './session/createDatabaseSession'
export { requireDocument, requireView } from './session/documentAccess'
export { isEntityOnLockedLayer } from './session/lockedLayer'
export { runSessionEdit } from './session/runSessionEdit'
export { CadActionExecutor } from './tools/CadActionExecutor'
export {
  createCadToolCatalog,
  type CadToolCatalogOptions
} from './tools/createCadToolCatalog'
export {
  type CadToolAccess,
  type CadToolDefinition,
  type Point2dInput,
  type ToolResult,
  type ToolResultImage,
  type ToolResultSavedFile
} from './tools/types'
