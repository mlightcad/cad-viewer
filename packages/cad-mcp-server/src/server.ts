import { createRequire } from 'node:module'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerCadMcpTools } from './catalogTools.js'
import { CadMcpSession } from './session.js'

const require = createRequire(import.meta.url)
const { version: packageVersion } = require('../package.json') as {
  version: string
}

/**
 * Builds the stdio MCP server that exposes CAD script tools.
 *
 * The headless Chromium session is started lazily on the first tool call.
 */
export function createCadMcpServer(): McpServer {
  const server = new McpServer({
    name: 'cad-mcp-server',
    version: packageVersion
  })

  registerCadMcpTools(server, {
    openDrawing: async input => {
      const session = await CadMcpSession.shared()
      return session.openDrawing(input)
    },
    executeCadScript: async input => {
      const session = await CadMcpSession.shared()
      return session.executeCadScript(input)
    }
  })

  return server
}
