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
      inputSchema: z.object({
        code: z.string().min(1),
        intent: z.string().min(1)
      }),
      execute: (input: unknown) =>
        executeCadScript(input as { code: string; intent: string }, session)
    }
  ]
  return tools as CadToolDefinition[]
}
