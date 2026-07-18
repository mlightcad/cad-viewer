/**
 * CAD Agent plugin for cad-viewer.
 *
 * @packageDocumentation
 */

import './ui/agent-panel.css'

export { default as AgentChatPanel } from './ui/AgentChatPanel.vue'
export {
  CadActionExecutor,
  cadActionExecutor,
  type Point2dInput,
  type ToolResult
} from './tools/CadActionExecutor'
export { createCadTools, type CadTools } from './tools/cadTools'
export {
  getDrawingContext,
  type DrawingContextSnapshot
} from './tools/DrawingContextProvider'
