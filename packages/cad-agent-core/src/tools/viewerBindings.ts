import {
  CadActionExecutor as CoreCadActionExecutor,
  type CadScriptEffects,
  type CadScriptLimits,
  type CadScriptRunOptions,
  type CadSession,
  type CadToolCatalogOptions,
  type CadToolDefinition,
  createCadScriptHost as coreCreateCadScriptHost,
  createCadToolCatalog as coreCreateCadToolCatalog,
  executeCadScript as coreExecuteCadScript,
  type ToolResult
} from '@mlightcad/cad-script-core'

import { createDocManagerSession } from '../session/createDocManagerSession'
import { withViewerDefaults } from '../session/withViewerDefaults'

/**
 * {@link CoreCadActionExecutor} bound to the viewer.
 *
 * Defaults to {@link createDocManagerSession}; a custom session gets the
 * viewer edit and preview hooks it does not define.
 */
export class CadActionExecutor extends CoreCadActionExecutor {
  /**
   * @param session - Drawing access. Defaults to the live `AcApDocManager` session.
   */
  constructor(session: CadSession = createDocManagerSession()) {
    super(withViewerDefaults(session))
  }
}

/**
 * Builds the tool catalog for one session, defaulting to the live viewer.
 *
 * See `createCadToolCatalog` in `@mlightcad/cad-script-core`.
 *
 * @param session - Drawing access. Defaults to {@link createDocManagerSession}.
 * @param options - Catalog behavior (e.g. whether screenshots are allowed).
 * @returns Tool definitions in a stable order.
 */
export function createCadToolCatalog(
  session: CadSession = createDocManagerSession(),
  options: CadToolCatalogOptions = {}
): CadToolDefinition[] {
  return coreCreateCadToolCatalog(withViewerDefaults(session), options)
}

/**
 * Validates and runs a CAD script with viewer edit and preview hooks.
 *
 * See `executeCadScript` in `@mlightcad/cad-script-core`.
 *
 * @param input - Script body and a short description used in the result message.
 * @param session - Drawing and view access.
 * @param options - Time, tick, and result-size limits.
 * @returns A {@link ToolResult}. Write scripts that time out do not commit.
 */
export function executeCadScript(
  input: { code: string; intent?: string },
  session: CadSession,
  options: CadScriptRunOptions = {}
): Promise<ToolResult> {
  return coreExecuteCadScript(input, withViewerDefaults(session), options)
}

/**
 * Builds the `cad` host for a script with viewer edit and preview hooks.
 *
 * See `createCadScriptHost` in `@mlightcad/cad-script-core`.
 *
 * @param session - Drawing and view access.
 * @param effects - Mutable log, highlight, and created-id collectors.
 * @param limits - Tick budget. Defaults to 100000 statements or 2 seconds.
 * @returns The host passed as the `cad` argument.
 */
export function createCadScriptHost(
  session: CadSession,
  effects: CadScriptEffects,
  limits?: CadScriptLimits
): ReturnType<typeof coreCreateCadScriptHost> {
  return coreCreateCadScriptHost(withViewerDefaults(session), effects, limits)
}
