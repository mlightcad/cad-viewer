/**
 * Shared CAD agent runtime: drawing tools, script host, and session access.
 *
 * Chat, MCP, and WebMCP adapters depend on this package. It does not depend
 * on a model SDK or a UI framework.
 *
 * @packageDocumentation
 */

export {
  getDrawingContext,
  type DrawingContextSnapshot
} from './context/DrawingContextProvider'
export {
  createCadScriptHost,
  type CadEditTransaction,
  type CadScriptEffects,
  type CadScriptLimits
} from './script/createCadScriptHost'
export { toEntitySnapshot, type EntitySnapshot } from './script/entitySnapshot'
export {
  executeCadScript,
  MAX_SCRIPT_RESULT_CHARS,
  type CadScriptRunOptions
} from './script/executeCadScript'
export { instrumentCadScript } from './script/instrumentCadScript'
export {
  CAD_EDIT_TX_METHODS,
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
  type CadSessionView
} from './session/CadSession'
export { createDocManagerSession } from './session/createDocManagerSession'
export { requireDocument, requireView } from './session/documentAccess'
export { CadActionExecutor } from './tools/CadActionExecutor'
export { createCadToolCatalog } from './tools/createCadToolCatalog'
export {
  type CadToolAccess,
  type CadToolDefinition,
  type Point2dInput,
  type ToolResult
} from './tools/types'
