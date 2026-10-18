import type { ZodType } from 'zod'

/**
 * 2D point in WCS used by agent tool inputs and script snapshots.
 */
export interface Point2dInput {
  x: number
  y: number
}

/**
 * Outcome of a CAD tool invocation.
 *
 * Serialized back to the model as JSON. Script execution adds `data`, `log`,
 * and `highlightedIds`.
 */
export interface ToolResult {
  /** Whether the operation completed without error. */
  success: boolean
  /** Short human-readable summary for the model. */
  message: string
  /** Object ids of entities created, when applicable. */
  entityIds?: string[]
  /** Machine-readable error code or message when `success` is false. */
  error?: string
  /** JSON-serializable value returned by a script. */
  data?: unknown
  /** Lines recorded with `cad.log` during a script. */
  log?: string[]
  /** Entity ids last passed to `cad.selection` during a script. */
  highlightedIds?: string[]
}

/**
 * Who may invoke a catalog tool.
 *
 * `execute_cad_script` is classified as `write` because a script can mutate
 * the drawing. The runner still allows a read-only drawing when the script
 * does not call `cad.edit`.
 */
export type CadToolAccess = 'read' | 'write' | 'view'

/**
 * Transport-agnostic tool definition.
 *
 * The chat plugin, a future MCP server, and WebMCP each map this record onto
 * their own tool protocol. `inputSchema` is the source of truth; JSON Schema
 * conversion is left to those adapters.
 */
export interface CadToolDefinition<TInput = unknown> {
  /** Stable tool name. */
  name: string
  /** Model-facing description. */
  description: string
  /** Zod schema for tool arguments. */
  inputSchema: ZodType<TInput>
  /** Permission class for adapters that filter the catalog. */
  access: CadToolAccess
  /**
   * Runs the tool against the session captured when the catalog was created.
   *
   * @param input - Arguments already parsed by the caller, or raw model input.
   * @returns A JSON-serializable result.
   */
  execute(input: TInput): Promise<unknown> | unknown
}
