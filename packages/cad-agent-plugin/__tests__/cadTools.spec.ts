import type { ToolResult } from '@mlightcad/cad-agent-core'

import { createCadTools } from '../src/tools/cadTools'

const mockExecute = jest.fn<Promise<ToolResult>, [unknown]>()

jest.mock('@mlightcad/cad-agent-core', () => {
  const { z } = jest.requireActual<typeof import('zod')>('zod')
  return {
    createCadToolCatalog: () => [
      {
        name: 'execute_cad_script',
        description: 'run a script',
        access: 'write',
        inputSchema: z.object({ code: z.string() }),
        execute: (input: unknown) => mockExecute(input)
      }
    ]
  }
})

const SCRIPT_RESULT: ToolResult = {
  success: true,
  message: 'Script finished — Inspect drawing',
  data: { total: 917, byType: { Table: 1, MText: 139 } },
  images: [{ mediaType: 'image/png', dataUrl: 'data:image/png;base64,AAAA' }]
}

/**
 * Calls the tool's `toModelOutput` the way AI SDK v5 does: with the raw
 * `execute()` result, not wrapped in `{ output }`.
 */
async function modelOutputFor(agentMode: 'simple' | 'high-inference') {
  mockExecute.mockResolvedValueOnce(SCRIPT_RESULT)
  const tool = createCadTools({ agentMode }).execute_cad_script
  const output = await tool.execute!(
    { code: 'return 1' },
    {
      toolCallId: 't1',
      messages: []
    }
  )
  return tool.toModelOutput!(output as ToolResult)
}

describe('createCadTools toModelOutput', () => {
  test('Simple mode sends the script result to the model, not null', async () => {
    const out = await modelOutputFor('simple')
    expect(out.type).toBe('json')
    const value = (out as { value: Record<string, unknown> }).value
    expect(value).not.toBeNull()
    expect(value.success).toBe(true)
    expect(value.data).toEqual(SCRIPT_RESULT.data)
    expect(value).not.toHaveProperty('images')
  })

  test('High inference mode sends JSON text plus screenshots', async () => {
    const out = await modelOutputFor('high-inference')
    expect(out.type).toBe('content')
    const parts = (
      out as { value: Array<{ type: string; text?: string; data?: string }> }
    ).value
    expect(parts[0].type).toBe('text')
    expect(JSON.parse(parts[0].text!).data).toEqual(SCRIPT_RESULT.data)
    expect(parts[1]).toMatchObject({ type: 'media', data: 'AAAA' })
  })
})
