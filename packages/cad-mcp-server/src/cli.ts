#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createCadMcpServer } from './server.js'

/**
 * stdio entry for `@mlightcad/cad-mcp-server`.
 *
 * stdout is reserved for MCP JSON-RPC — log only to stderr.
 *
 * Env (optional):
 * - `CAD_MCP_VISIBLE=1` — default headed when tools omit `visible`
 * - `CAD_MCP_IDLE_CLOSE_MS` — headless idle auto-close delay (default 30000)
 */
async function main(): Promise<void> {
  const server = createCadMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  const visibleDefault =
    process.env.CAD_MCP_VISIBLE?.trim().toLowerCase() === '1' ||
    process.env.CAD_MCP_VISIBLE?.trim().toLowerCase() === 'true' ||
    process.env.CAD_MCP_VISIBLE?.trim().toLowerCase() === 'yes'
  console.error(
    `[cad-mcp-server] listening on stdio (default ${visibleDefault ? 'headed' : 'headless'})`
  )
}

main().catch(error => {
  console.error(
    '[cad-mcp-server] fatal:',
    error instanceof Error ? error.message : error
  )
  process.exit(1)
})
