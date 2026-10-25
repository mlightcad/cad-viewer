import { CAD_SCRIPT_API_SUMMARY } from '@mlightcad/cad-agent-core/script-api'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { toolResultToMcpContent } from './toolResult.js'

/**
 * Input schema for `execute_cad_script`.
 *
 * Kept in sync with {@link createCadToolCatalog} in `@mlightcad/cad-agent-core`
 * (`code` first so streaming providers do not finalize on `intent` alone).
 */
export const executeCadScriptInputSchema = {
  code: z
    .string()
    .min(1)
    .describe(
      'JavaScript function body using cad.* (required). Prefer short scripts; for complex drawings use multiple calls.'
    ),
  intent: z
    .string()
    .max(200)
    .optional()
    .describe(
      'Optional short label for the tool result. Never send intent alone — code is required. Prefer emitting code before intent.'
    )
}

/**
 * Input schema for MCP-only document lifecycle tool `open_drawing`.
 */
export const openDrawingInputSchema = {
  path: z
    .string()
    .optional()
    .describe(
      'Local .dxf/.dwg path or http(s) URL. Omit to create a blank ISO template drawing.'
    ),
  mode: z
    .enum(['read', 'write'])
    .optional()
    .describe(
      'Open mode. Default: write when path is omitted, read when path is set. Use write to edit an existing file.'
    )
}

export interface RegisterCadMcpToolsOptions {
  /**
   * Opens a drawing (or blank template) in the CAD session.
   */
  openDrawing: (input: {
    path?: string
    mode?: 'read' | 'write'
  }) => Promise<{ ok: true; title: string; mode: 'read' | 'write' }>
  /**
   * Runs `execute_cad_script` against the live CadSession (typically in-page).
   */
  executeCadScript: (input: {
    code: string
    intent?: string
  }) => Promise<unknown>
}

/**
 * Registers the script-first CAD tool surface on an MCP server.
 *
 * Tools:
 * - `open_drawing` — document lifecycle (not part of agent-core catalog)
 * - `execute_cad_script` — same catalog tool as the in-app CAD Agent / Script
 *   panel on both cad-simple-viewer and cad-viewer hosts
 *
 * @param server - MCP server instance
 * @param options - Session-backed executors
 */
export function registerCadMcpTools(
  server: McpServer,
  options: RegisterCadMcpToolsOptions
): void {
  // MCP SDK + zod generics often hit TS2589; register via a loose shim.
  const register = server.registerTool.bind(server) as (
    name: string,
    config: {
      description: string
      inputSchema: Record<string, z.ZodTypeAny>
    },
    handler: (input: Record<string, unknown>) => Promise<{
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; data: string; mimeType: string }
      >
      isError?: boolean
    }>
  ) => void

  register(
    'open_drawing',
    {
      description:
        'Open a DXF/DWG drawing (local path or http(s) URL), or omit path to create a blank ISO template. Call before editing an existing file. Drawing ops use execute_cad_script.',
      inputSchema: openDrawingInputSchema
    },
    async input => {
      try {
        const result = await options.openDrawing({
          path: input.path as string | undefined,
          mode: input.mode as 'read' | 'write' | undefined
        })
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          ],
          isError: true
        }
      }
    }
  )

  register(
    'execute_cad_script',
    {
      description: CAD_SCRIPT_API_SUMMARY,
      inputSchema: executeCadScriptInputSchema
    },
    async input => {
      try {
        const raw = await options.executeCadScript({
          code: input.code as string,
          intent: input.intent as string | undefined
        })
        return toolResultToMcpContent(
          raw as import('@mlightcad/cad-agent-core').ToolResult
        )
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                message: 'Script execution failed',
                error: error instanceof Error ? error.message : String(error)
              })
            }
          ],
          isError: true
        }
      }
    }
  )
}
