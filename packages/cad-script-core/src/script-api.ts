/**
 * Node-safe entry: script API constants only (no viewer / DocManager imports).
 *
 * Out-of-process hosts (for example the MCP server's Node side) can import
 * `@mlightcad/cad-script-core/script-api` to get the constants without
 * loading `@mlightcad/data-model`.
 */
export {
  CAD_EDIT_TX_METHODS,
  CAD_MCP_DXF_OUTBOX_KEY,
  CAD_MCP_FILE_OUTBOX_KEY,
  CAD_SCRIPT_API_SUMMARY,
  CAD_SCRIPT_API_TREE
} from './script/scriptApi'
