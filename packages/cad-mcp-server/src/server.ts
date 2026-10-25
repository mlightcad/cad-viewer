import { createRequire } from 'node:module'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerCadMcpTools } from './catalogTools.js'
import { CadMcpSession } from './session.js'

const require = createRequire(import.meta.url)
const { version: packageVersion } = require('../package.json') as {
  version: string
}

/**
 * Resolves whether the browser should be visible.
 *
 * Tool `visible` wins when set; otherwise `CAD_MCP_VISIBLE=1` / `true` / `yes`
 * forces headed as the default for omitted `visible`.
 */
export function resolveVisible(toolVisible?: boolean): boolean {
  if (typeof toolVisible === 'boolean') {
    return toolVisible
  }
  const env = process.env.CAD_MCP_VISIBLE?.trim().toLowerCase()
  return env === '1' || env === 'true' || env === 'yes'
}

/**
 * Builds the stdio MCP server that exposes CAD script tools.
 *
 * The Chromium session is started lazily on the first tool call (headless or
 * headed depending on `visible` / `CAD_MCP_VISIBLE`).
 */
export function createCadMcpServer(): McpServer {
  const server = new McpServer({
    name: 'cad-mcp-server',
    version: packageVersion
  })

  registerCadMcpTools(server, {
    openDrawing: async input => {
      const session = await CadMcpSession.shared({
        headed: resolveVisible(input.visible)
      })
      return session.openDrawing(input)
    },
    executeCadScript: async input => {
      const session = await CadMcpSession.shared({
        headed: resolveVisible(input.visible)
      })
      return session.executeCadScript(input)
    }
  })

  return server
}
