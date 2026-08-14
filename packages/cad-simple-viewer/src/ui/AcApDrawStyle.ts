import { AcApSettingManager } from '../app/AcApSettingManager'

/**
 * Kind of drawing session served by the style overlay.
 *
 * - `'measure'` — measurement tools (distance, area, angle, arc, point)
 * - `'markup'` — markup drawing tools (text, line, arrow, cloud, and so on)
 */
export type AcApDrawStyleKind = 'measure' | 'markup'

/**
 * Global command names that enter a measurement drawing session.
 */
const MEASURE_DRAW_COMMANDS = new Set([
  'measuredistance',
  'measurearea',
  'measureangle',
  'measurearc',
  'measurepoint'
])

/**
 * Global command names that enter a markup drawing session.
 */
const MARKUP_DRAW_COMMANDS = new Set([
  'markuptext',
  'markupline',
  'markuparrow',
  'markupcloud',
  'markuprect',
  'markupcircle',
  'markuphighlight',
  'markupcallout',
  'markupstamp'
])

/**
 * Whether the draw-style overlay is currently visible.
 */
let toolbarVisible = false

/**
 * Subscribers notified when {@link setDrawStyleToolbarVisible} changes.
 */
const visibilityListeners = new Set<(visible: boolean) => void>()

/**
 * Maps a command global name to the draw-style overlay kind.
 *
 * @param commandName - Command global name; comparison is case-insensitive.
 * @returns `'measure'` or `'markup'`, or `undefined` if the command is unrelated.
 */
export function drawStyleKindForCommand(
  commandName: string | undefined
): AcApDrawStyleKind | undefined {
  const name = commandName?.trim().toLowerCase()
  if (!name) return undefined
  if (MEASURE_DRAW_COMMANDS.has(name)) return 'measure'
  if (MARKUP_DRAW_COMMANDS.has(name)) return 'markup'
  return undefined
}

/**
 * Whether the overlay should be shown for the given session.
 *
 * The overlay is only needed when the host ribbon is turned off;
 * cad-viewer already exposes color / lineweight / font-size on the ribbon.
 *
 * @param kind - Active drawing session, or `undefined` when none is running.
 * @param showRibbon - Whether the host ribbon is visible.
 * @returns `true` when the overlay should be displayed.
 */
export function shouldShowDrawStyleToolbar(
  kind: AcApDrawStyleKind | undefined,
  showRibbon: boolean = AcApSettingManager.instance.isShowRibbon
): boolean {
  return kind != null && !showRibbon
}

/**
 * Whether the draw-style overlay is currently shown.
 *
 * @returns `true` if the toolbar DOM is visible.
 */
export function isDrawStyleToolbarVisible(): boolean {
  return toolbarVisible
}

/**
 * Subscribe to overlay show/hide changes (for example, to hide the filename).
 *
 * @param listener - Called with the new visibility flag.
 * @returns Function that removes this listener.
 */
export function subscribeDrawStyleToolbarVisibility(
  listener: (visible: boolean) => void
): () => void {
  visibilityListeners.add(listener)
  return () => {
    visibilityListeners.delete(listener)
  }
}

/**
 * Updates overlay visibility and notifies subscribers.
 *
 * @param visible - Whether the overlay is shown.
 * @internal
 */
export function setDrawStyleToolbarVisible(visible: boolean): void {
  if (toolbarVisible === visible) return
  toolbarVisible = visible
  for (const listener of visibilityListeners) listener(visible)
}
