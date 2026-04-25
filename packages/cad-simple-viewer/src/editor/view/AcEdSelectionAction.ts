/**
 * Describes how a new selection result should be applied to the current
 * selection set.
 *
 * - `'replace'`: clear the current selection set, then add the new ids.
 * - `'add'`: keep the current selection set and append any new ids.
 * - `'remove'`: remove matching ids from the current selection set.
 *
 * This type is used by the view layer to unify click selection, box
 * selection, and command-driven selection behavior.
 */
export type AcEdSelectionAction = 'replace' | 'add' | 'remove'

/**
 * Minimal modifier-key snapshot needed to resolve selection behavior from a
 * mouse or pointer event.
 *
 * The full DOM {@link MouseEvent} object is intentionally not required here so
 * the resolver can stay lightweight, reusable, and easy to test in isolation.
 */
export interface AcEdSelectionModifierState {
  /**
   * Whether the Shift key was pressed when the selection event occurred.
   *
   * In this viewer, Shift has the highest priority and maps to
   * {@link AcEdSelectionAction | `'remove'`}.
   */
  shiftKey: boolean

  /**
   * Whether the Control key was pressed when the selection event occurred.
   *
   * When `true` and {@link shiftKey} is `false`, the selection resolves to
   * {@link AcEdSelectionAction | `'add'`}.
   */
  ctrlKey: boolean

  /**
   * Whether the Meta/Command key was pressed when the selection event
   * occurred.
   *
   * This provides macOS-friendly additive selection behavior equivalent to
   * {@link ctrlKey}.
   */
  metaKey: boolean
}

/**
 * Resolves the selection action implied by the current modifier-key state.
 *
 * Precedence is evaluated in the following order:
 * 1. `Shift` returns `'remove'`.
 * 2. `Ctrl` or `Meta` returns `'add'`.
 * 3. If no modifier is active, `defaultAction` is returned.
 *
 * This lets different call sites share the same modifier semantics while still
 * choosing their own non-modified default, such as `'replace'` for generic
 * selection flows or `'add'` for pointer interactions that should preserve the
 * existing selection set.
 *
 * @param e - Modifier-key state captured from the triggering input event.
 * @param defaultAction - Action to use when no supported modifier key is
 * active. Defaults to `'replace'`.
 * @returns The normalized selection action to apply.
 *
 * @example
 * ```ts
 * resolveSelectionActionFromEvent(
 *   { shiftKey: false, ctrlKey: false, metaKey: false },
 *   'replace'
 * )
 * // => 'replace'
 * ```
 *
 * @example
 * ```ts
 * resolveSelectionActionFromEvent({
 *   shiftKey: true,
 *   ctrlKey: false,
 *   metaKey: false
 * })
 * // => 'remove'
 * ```
 */
export function resolveSelectionActionFromEvent(
  e: AcEdSelectionModifierState,
  defaultAction: AcEdSelectionAction = 'replace'
): AcEdSelectionAction {
  if (e.shiftKey) return 'remove'
  if (e.ctrlKey || e.metaKey) return 'add'
  return defaultAction
}

/**
 * Resolves the default action for direct pointer-based selection in the 2D
 * viewer.
 *
 * Unlike the generic resolver, pointer selection without modifiers defaults to
 * `'add'` so repeated clicks or drag selections preserve the existing
 * selection set instead of replacing it.
 *
 * Modifier precedence remains the same as
 * {@link resolveSelectionActionFromEvent}:
 * `Shift` removes, while `Ctrl`/`Meta` adds.
 *
 * @param e - Modifier-key state captured from the pointer event.
 * @returns The selection action that should be used for pointer selection.
 *
 * @example
 * ```ts
 * resolvePointerSelectionAction({
 *   shiftKey: false,
 *   ctrlKey: false,
 *   metaKey: false
 * })
 * // => 'add'
 * ```
 */
export function resolvePointerSelectionAction(
  e: AcEdSelectionModifierState
): AcEdSelectionAction {
  return resolveSelectionActionFromEvent(e, 'add')
}
