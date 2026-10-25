/**
 * Node-safe entry: script API constants only (no viewer / DocManager imports).
 *
 * MCP adapters and other out-of-process hosts should import from
 * `@mlightcad/cad-agent-core/script-api` so they do not pull browser peers.
 */
export {
  CAD_EDIT_TX_METHODS,
  CAD_SCRIPT_API_SUMMARY,
  CAD_SCRIPT_API_TREE
} from './script/scriptApi'
