import { z } from 'zod'

import { executeCadScript } from '../script/executeCadScript'
import { CAD_SCRIPT_API_SUMMARY } from '../script/scriptApi'
import type { CadSession } from '../session/CadSession'
import { createDocManagerSession } from '../session/createDocManagerSession'
import type { CadToolDefinition } from './types'

/** Options for {@link createCadToolCatalog}. */
export interface CadToolCatalogOptions {
  /**
   * When `false`, `cad.view.capturePreview` queues are not fulfilled and the
   * tool description tells the model not to call it. Default `true`.
   */
  allowPreviewCapture?: boolean
}

/**
 * Builds the tool catalog for one session.
 *
 * Script-first: the only tool is `execute_cad_script`. Drawing context is
 * available as `cad.drawing` inside the script. Chat, MCP, and WebMCP adapters
 * should call this instead of declaring tools themselves.
 *
 * @param session - Drawing access captured by every tool in the catalog.
 * @param options - Catalog behavior (e.g. whether screenshots are allowed).
 * @returns Tool definitions in a stable order.
 */
export function createCadToolCatalog(
  session: CadSession = createDocManagerSession(),
  options: CadToolCatalogOptions = {}
): CadToolDefinition[] {
  const allowPreviewCapture = options.allowPreviewCapture !== false
  const description = allowPreviewCapture
    ? CAD_SCRIPT_API_SUMMARY
    : `${CAD_SCRIPT_API_SUMMARY}

IMPORTANT: cad.view.capturePreview is DISABLED in this session. Do not call it.
Verify geometry only with cad.measure (check / report). Screenshots are reserved
for High inference mode.`

  const tools = [
    {
      name: 'execute_cad_script',
      description,
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
        return executeCadScript(args, session, {
          fulfillPreviews: allowPreviewCapture
        })
      }
    }
  ]
  return tools as CadToolDefinition[]
}
