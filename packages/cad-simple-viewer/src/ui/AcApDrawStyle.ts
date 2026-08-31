import type { AcApContext } from '../app/AcApContext'
import { AcApSettingManager } from '../app/AcApSettingManager'
import type { AcEdSessionAccessory } from '../editor/command/AcEdSessionAccessory'
import type { AcEdBaseView } from '../editor/view/AcEdBaseView'

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
  'measurecontinuous',
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
 * Host-level ribbon presence that does not touch persisted settings.
 *
 * `undefined` — use {@link AcApSettingManager.isShowRibbon}.
 * `false` — shells without a ribbon (simple-ui) always show the overlay.
 * `true` — force the overlay off even if the setting would show it.
 */
let hostHasRibbon: boolean | undefined

/**
 * Whether the draw-style overlay is currently visible.
 */
let toolbarVisible = false

/**
 * Subscribers notified when {@link acapSetDrawStyleToolbarVisible} changes.
 */
const visibilityListeners = new Set<(visible: boolean) => void>()

/**
 * Maps a command global name to the draw-style overlay kind.
 *
 * @param commandName - Command global name; comparison is case-insensitive.
 * @returns `'measure'` or `'markup'`, or `undefined` if the command is unrelated.
 */
export function acapDrawStyleKindForCommand(
  commandName: string | undefined
): AcApDrawStyleKind | undefined {
  const name = commandName?.trim().toLowerCase()
  if (!name) return undefined
  if (MEASURE_DRAW_COMMANDS.has(name)) return 'measure'
  if (MARKUP_DRAW_COMMANDS.has(name)) return 'markup'
  return undefined
}

/**
 * Session kind for the overlay: an active draw command wins, otherwise a
 * selected markup or measurement keeps the toolbar available for restyling.
 *
 * Mixed markup + measurement selection matches the ribbon: neither kind owns
 * the session, so the overlay hides until the selection is exclusive.
 *
 * @param input - Active command kind and overlay selection flags.
 * @returns `'measure'` or `'markup'`, or `undefined` when the overlay should hide.
 */
export function acapResolveDrawStyleKind(input: {
  /** Kind of the running draw command, if any. */
  commandKind?: AcApDrawStyleKind
  /** True when a markup overlay is selected. */
  markupSelected?: boolean
  /** True when a measurement overlay is selected. */
  measurementSelected?: boolean
}): AcApDrawStyleKind | undefined {
  if (input.commandKind) return input.commandKind
  if (input.markupSelected && input.measurementSelected) return undefined
  if (input.markupSelected) return 'markup'
  if (input.measurementSelected) return 'measure'
  return undefined
}

/**
 * Tell the overlay whether this host has a command ribbon.
 *
 * Simple-ui has no ribbon and must not persist `isShowRibbon = false`,
 * which would leak into cad-viewer on the same origin. Pass `undefined`
 * to go back to the persisted setting.
 *
 * @param hasRibbon - Host ribbon presence, or `undefined` to clear.
 */
export function acapSetDrawStyleHostHasRibbon(
  hasRibbon: boolean | undefined
): void {
  hostHasRibbon = hasRibbon
}

/**
 * Ribbon visibility used when {@link acapShouldShowDrawStyleToolbar} omits
 * an explicit `showRibbon` argument.
 *
 * @returns `true` when the host ribbon is treated as visible.
 */
export function acapIsDrawStyleHostRibbonVisible(): boolean {
  return hostHasRibbon ?? AcApSettingManager.instance.isShowRibbon
}

/**
 * Whether the overlay should be shown for the given session.
 *
 * The overlay is only needed when the host ribbon is turned off;
 * cad-viewer already exposes color / lineweight / font-size on the ribbon.
 *
 * @param kind - Active drawing or selection session, or `undefined` when none.
 * @param showRibbon - Whether the host ribbon is visible.
 * @returns `true` when the overlay should be displayed.
 */
export function acapShouldShowDrawStyleToolbar(
  kind: AcApDrawStyleKind | undefined,
  showRibbon: boolean = acapIsDrawStyleHostRibbonVisible()
): boolean {
  return kind != null && !showRibbon
}

/**
 * Whether the draw-style overlay is currently shown.
 *
 * @returns `true` if the toolbar DOM is visible.
 */
export function acapIsDrawStyleToolbarVisible(): boolean {
  return toolbarVisible
}

/**
 * Subscribe to overlay show/hide changes (for example, to hide the filename).
 *
 * @param listener - Called with the new visibility flag.
 * @returns Function that removes this listener.
 */
export function acapSubscribeDrawStyleToolbarVisibility(
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
export function acapSetDrawStyleToolbarVisible(visible: boolean): void {
  if (toolbarVisible === visible) return
  toolbarVisible = visible
  for (const listener of visibilityListeners) listener(visible)
}

/**
 * Host that can mount color / font-size controls into the session panel.
 */
export interface AcApDrawStyleSessionHost {
  createSessionAccessory(): AcEdSessionAccessory
}

const sessionHosts = new WeakMap<object, AcApDrawStyleSessionHost>()

/**
 * Registers the view's draw-style toolbar as the session-panel accessory host.
 *
 * @param view - View whose container hosts the overlay.
 * @param host - Toolbar that can reparent controls into the session slot.
 */
export function acapRegisterDrawStyleSessionHost(
  view: AcEdBaseView,
  host: AcApDrawStyleSessionHost
): void {
  sessionHosts.set(view, host)
}

/**
 * Drops the view's draw-style session host (toolbar dispose).
 *
 * @param view - View previously passed to {@link acapRegisterDrawStyleSessionHost}.
 */
export function acapUnregisterDrawStyleSessionHost(view: AcEdBaseView): void {
  sessionHosts.delete(view)
}

/**
 * Makes `command.createSessionAccessory` return the view's draw-style controls.
 *
 * @param command - Command that should expose color / font-size on phone/pad.
 */
export function acapBindDrawStyleSessionAccessory(command: {
  createSessionAccessory: (
    context: AcApContext
  ) => AcEdSessionAccessory | null
}): void {
  command.createSessionAccessory = context =>
    sessionHosts.get(context.view)?.createSessionAccessory() ?? null
}
