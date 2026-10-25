/**
 * Launch the published @mlightcad/cad-mcp-server via npx from a cwd outside
 * this monorepo. Running npx in the workspace root crashes npm Arborist on the
 * local workspace link (Cannot read properties of null (reading 'package')).
 */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

const VERSION = process.env.CAD_MCP_SERVER_VERSION || '1.7.8-preview.1'
const pkg = `@mlightcad/cad-mcp-server@${VERSION}`

// shell: true — Windows Node cannot spawn .cmd shims without it (EINVAL)
const child = spawn(
  'npx',
  ['-y', `--package=${pkg}`, 'cad-mcp-server'],
  {
    cwd: tmpdir(),
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      npm_config_workspaces: 'false'
    },
    windowsHide: true
  }
)

child.on('error', err => {
  console.error('[cad-mcp-server] failed to start npx:', err.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
