import { createCadToolCatalog } from '@mlightcad/cad-agent-core'
import { tool } from 'ai'

/**
 * Creates the tool set exposed to the CAD agent LLM.
 *
 * Schemas and execution live in `@mlightcad/cad-agent-core`. This adapter only
 * maps that catalog onto the AI SDK tool format.
 *
 * @returns AI SDK tool definitions keyed by tool name.
 */
export function createCadTools() {
  return Object.fromEntries(
    createCadToolCatalog().map(entry => [
      entry.name,
      tool({
        description: entry.description,
        inputSchema: entry.inputSchema,
        execute: async (input: unknown) => entry.execute(input)
      })
    ])
  )
}

/** Inferred tool map type returned by {@link createCadTools}. */
export type CadTools = ReturnType<typeof createCadTools>
