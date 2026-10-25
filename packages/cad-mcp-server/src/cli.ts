#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createCadMcpServer } from './server.js'

/**
 * stdio entry for `@mlightcad/cad-mcp-server`.
 *
 * stdout is reserved for MCP JSON-RPC — log only to stderr.
 */
async function main(): Promise<void> {
  const server = createCadMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[cad-mcp-server] listening on stdio')
}

main().catch(error => {
  console.error(
    '[cad-mcp-server] fatal:',
    error instanceof Error ? error.message : error
  )
  process.exit(1)
})
