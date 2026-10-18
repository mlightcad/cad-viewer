import type { CadSession } from '../session/CadSession'
import { requireDocument } from '../session/documentAccess'
import type { ToolResult } from '../tools/types'
import {
  type CadScriptEffects,
  type CadScriptLimits,
  createCadScriptHost
} from './createCadScriptHost'
import { instrumentCadScript } from './instrumentCadScript'
import { validateCadScript } from './validateCadScript'

/** Default cap on the JSON returned to the model. */
export const MAX_SCRIPT_RESULT_CHARS = 65_536

const SHADOW_GLOBALS = [
  'window',
  'document',
  'globalThis',
  'Function',
  'fetch',
  'navigator',
  'location',
  'parent',
  'top',
  'self',
  'frames',
  'localStorage',
  'sessionStorage',
  'XMLHttpRequest',
  'WebSocket',
  'process',
  'require',
  'module',
  'exports',
  'Deno',
  'Bun'
]

/**
 * Options for one script execution.
 */
export interface CadScriptRunOptions {
  /** Overrides the default tick and time budget. */
  limits?: Partial<CadScriptLimits>
  /** Maximum JSON length of the returned `data` field. */
  maxResultChars?: number
}

/**
 * Validates and runs a CAD script against `session`.
 *
 * @param input - Script body and a short description used in the result message.
 * @param session - Drawing and view access.
 * @param options - Time, tick, and result-size limits.
 * @returns A {@link ToolResult}. Write scripts that time out do not commit.
 */
export function executeCadScript(
  input: { code: string; intent: string },
  session: CadSession,
  options: CadScriptRunOptions = {}
): ToolResult {
  const validation = validateCadScript(input.code)
  if (!validation.ok) {
    return {
      success: false,
      message: 'Script was rejected before it ran',
      error: validation.error
    }
  }
  if (validation.usesEdit) {
    const accessError = requireDocument(session, true)
    if (accessError) return accessError
  }

  const effects: CadScriptEffects = {
    log: [],
    highlightedIds: [],
    createdIds: []
  }
  const host = createCadScriptHost(session, effects, {
    maxTicks: options.limits?.maxTicks ?? 100_000,
    maxMilliseconds: options.limits?.maxMilliseconds ?? 2_000
  })

  try {
    const source = instrumentCadScript(input.code)
    const value = runSandboxed(source, host)
    const data = serializeResult(
      value,
      options.maxResultChars ?? MAX_SCRIPT_RESULT_CHARS
    )
    return {
      success: true,
      message: input.intent ? `Script finished: ${input.intent}` : 'Script finished',
      data,
      log: effects.log,
      highlightedIds: effects.highlightedIds,
      entityIds: effects.createdIds.length ? effects.createdIds : undefined
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: 'Script failed',
      error: reason,
      log: effects.log,
      highlightedIds: effects.highlightedIds
    }
  }
}

function serializeResult(value: unknown, maxChars: number): unknown {
  if (value === undefined) return undefined
  const json = JSON.stringify(value)
  if (json === undefined) {
    throw new Error('script_result_not_serializable')
  }
  if (json.length > maxChars) {
    return { truncated: true, preview: json.slice(0, maxChars) }
  }
  return JSON.parse(json) as unknown
}

function runSandboxed(source: string, host: unknown): unknown {
  // The script is validated and instrumented before this call. Shadowed
  // parameters hide page globals from the function body.
  const runner = new Function(
    'cad',
    ...SHADOW_GLOBALS,
    `"use strict";\n${source}\nreturn __cadScript(cad);`
  ) as (...args: unknown[]) => unknown
  return runner(host, ...SHADOW_GLOBALS.map(() => undefined))
}
