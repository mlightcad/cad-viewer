import type { ZodType } from 'zod'

/**
 * 2D point in WCS used by agent tool inputs and script snapshots.
 */
export interface Point2dInput {
  x: number
  y: number
}

/** DXF written or downloaded by `cad.file.saveDxf`. The file body is not included. */
export interface ToolResultSavedFile {
  /** Absolute path when MCP wrote the file; otherwise the download file name or requested path. */
  path: string
  /** Base name including `.dxf`. */
  fileName: string
  /** UTF-8 size of the DXF. */
  bytes: number
  /**
   * `file` — written by the MCP server.
   * `mcp` — queued for the MCP server (replaced with `file` after the write).
   * `download` — browser download started.
   * `none` — no host accepted the file (tests / non-browser).
   */
  delivery: 'file' | 'mcp' | 'download' | 'none'
}

/** Image attached to a tool result (e.g. script `cad.view.capturePreview`). */
export interface ToolResultImage {
  /** IANA media type, typically `image/png`. */
  mediaType: string
  /** Full data URL (`data:image/png;base64,...`). */
  dataUrl: string
}

/**
 * Outcome of a CAD tool invocation.
 *
 * Serialized back to the model as JSON. Script execution adds `data`, `log`,
 * `highlightedIds`, and optionally `images` (kept out of the JSON `data` cap).
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
  /**
   * Screenshots captured via `cad.view.capturePreview`.
   * Adapters should pass these to the model as multimodal tool-result media.
   */
  images?: ToolResultImage[]
  /**
   * DXF files produced by `cad.file.saveDxf`.
   * Summaries only — adapters must not echo the DXF body to the model.
   */
  savedFiles?: ToolResultSavedFile[]
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
