import { z } from 'zod'

import { executeCadScript } from '../script/executeCadScript'
import { CAD_SCRIPT_API_SUMMARY } from '../script/scriptApi'
import type { CadSession } from '../session/CadSession'
import { createDocManagerSession } from '../session/createDocManagerSession'
import type { CadToolDefinition } from './types'

/**
 * Builds the tool catalog for one session.
 *
 * Script-first: the only tool is `execute_cad_script`. Drawing context is
 * available as `cad.drawing` inside the script. Chat, MCP, and WebMCP adapters
 * should call this instead of declaring tools themselves.
 *
 * @param session - Drawing access captured by every tool in the catalog.
 * @returns Tool definitions in a stable order.
 */
export function createCadToolCatalog(
  session: CadSession = createDocManagerSession()
): CadToolDefinition[] {
  const tools = [
    {
      name: 'execute_cad_script',
      description: CAD_SCRIPT_API_SUMMARY,
      access: 'write',
      // `code` must be first: providers may finalize tool args when the buffer
      // is valid JSON. Emitting a complete `{intent}` object before `code`
      // causes premature finalize and leaves the call stuck without execution.
      inputSchema: z.object({
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
      }),
      execute: (input: unknown) => {
        const args = input as { code: string; intent?: string }
        return executeCadScript(args, session)
      }
    }
  ]
  return tools as CadToolDefinition[]
}
