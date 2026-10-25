/**
 * Public API for embedding or testing the CAD MCP server.
 *
 * The CLI entry is {@link ./cli.ts}; most hosts run `cad-mcp-server` via stdio.
 *
 * @packageDocumentation
 */

export {
  executeCadScriptInputSchema,
  openDrawingInputSchema,
  registerCadMcpTools,
  type RegisterCadMcpToolsOptions
} from './catalogTools.js'
export { createCadMcpServer, resolveVisible } from './server.js'
export {
  CadMcpSession,
  type CadMcpOpenMode,
  type CadMcpSessionCreateOptions
} from './session.js'
export {
  toolResultToMcpContent,
  type McpContentBlock
} from './toolResult.js'
