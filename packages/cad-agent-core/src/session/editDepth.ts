/**
 * Tracks nested script transactions so drawing tools join the outer undo group.
 *
 * Fixed tools each open their own undo mark. A script transaction increments this
 * depth first, and {@link runEdit} then runs the mutation inline.
 */
let scriptEditDepth = 0

/**
 * Returns how many script transactions are currently open on this turn.
 */
export function getScriptEditDepth(): number {
  return scriptEditDepth
}

/**
 * Runs `fn` while script-edit depth is elevated.
 *
 * @param fn - Callback that may call drawing tools.
 * @returns The value returned by `fn`.
 */
export function runInsideScriptEdit<T>(fn: () => T): T {
  scriptEditDepth++
  try {
    return fn()
  } finally {
    scriptEditDepth--
  }
}
