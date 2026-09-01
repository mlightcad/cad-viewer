import type { AcApContext } from '../app/AcApContext'
import { AcApSettingManager } from '../app/AcApSettingManager'
import type { AcEdSessionAccessory } from '../editor/command/AcEdSessionAccessory'
import type { AcEdBaseView } from '../editor/view/AcEdBaseView'
import {
  type AcApDrawStyleKind,
  acapDrawStyleKindForCommand
} from '../util/AcApCommandUtil'

/**
 * Kind of drawing session served by the draw-style session accessory.
 *
 * @see {@link AcApDrawStyleKind}
 */
export type AcUiDrawStyleKind = AcApDrawStyleKind

/** Input for {@link acuiResolveDrawStyleKind}. */
export interface AcUiResolveDrawStyleKindInput {
  /** Kind of the running draw command, if any. */
  commandKind?: AcUiDrawStyleKind
  /** True when a markup overlay is selected. */
  markupSelected?: boolean
  /** True when a measurement overlay is selected. */
  measurementSelected?: boolean
}

/**
 * Session kind for the draw-style accessory: an active draw command wins,
 * otherwise a selected markup or measurement keeps the controls available.
 *
 * Mixed markup + measurement selection matches the ribbon: neither kind owns
 * the session, so the accessory hides until the selection is exclusive.
 *
 * @param input - Active command kind and overlay selection flags.
 * @returns `'measure'` or `'markup'`, or `undefined` when the accessory should hide.
 */
export function acuiResolveDrawStyleKind(
  input: AcUiResolveDrawStyleKindInput
): AcUiDrawStyleKind | undefined {
  if (input.commandKind) return input.commandKind
  if (input.markupSelected && input.measurementSelected) return undefined
  if (input.markupSelected) return 'markup'
  if (input.measurementSelected) return 'measure'
  return undefined
}

/**
 * Whether the draw-style session accessory should be shown for the given session.
 *
 * The accessory is only needed when the host ribbon is turned off;
 * cad-viewer already exposes color / lineweight / font-size on the ribbon.
 * Shells without a ribbon (simple-ui) should set `isShowRibbon` to `false`
 * with `{ persist: false }` instead of a separate host flag.
 *
 * @param kind - Active drawing or selection session, or `undefined` when none.
 * @param showRibbon - Whether the host ribbon is visible.
 * @returns `true` when the session accessory should be displayed.
 */
export function acuiShouldShowDrawStyleToolbar(
  kind: AcUiDrawStyleKind | undefined,
  showRibbon: boolean = AcApSettingManager.instance.isShowRibbon
): boolean {
  return kind != null && !showRibbon
}

/**
 * Ribbon gate for a command-provided session accessory.
 *
 * Draw-style controls are suppressed on desktop when the host ribbon already
 * exposes the same color / font-size UI. Non-draw-style accessories pass through.
 *
 * @param slot - Target mount slot for this refresh.
 * @param commandName - Active command global name, if any.
 * @param accessory - Accessory returned by `createSessionAccessory`.
 * @returns `accessory`, or `null` when the desktop ribbon replaces draw-style.
 */
export function acuiFilterDesktopCommandSessionAccessory(
  slot: 'desktop' | 'mobile',
  commandName: string | undefined,
  accessory: AcEdSessionAccessory
): AcEdSessionAccessory | null {
  if (accessory.id !== 'draw-style') return accessory
  if (slot !== 'desktop') return accessory
  const kind = acapDrawStyleKindForCommand(commandName)
  if (!acuiShouldShowDrawStyleToolbar(kind)) return null
  return accessory
}

/**
 * Host that can mount color / font-size controls into a session accessory slot.
 */
export interface AcUiDrawStyleSessionHost {
  /**
   * Updates the active measure/markup session before controls mount.
   *
   * @param kind - `'measure'`, `'markup'`, or `undefined` when inactive.
   */
  setActiveKind(kind: AcUiDrawStyleKind | undefined): void
  /** Builds the session accessory that reparents draw-style controls. */
  createSessionAccessory(): AcEdSessionAccessory
}

/** Per-view draw-style session hosts registered by {@link acuiRegisterDrawStyleSessionHost}. */
const sessionHosts = new WeakMap<object, AcUiDrawStyleSessionHost>()

/**
 * Registers the view's draw-style controls as the session accessory host.
 *
 * @param view - View whose draw-style controls back session accessories.
 * @param host - Host that can reparent controls into a session slot.
 */
export function acuiRegisterDrawStyleSessionHost(
  view: AcEdBaseView,
  host: AcUiDrawStyleSessionHost
): void {
  sessionHosts.set(view, host)
}

/**
 * Drops the view's draw-style session host.
 *
 * @param view - View previously passed to {@link acuiRegisterDrawStyleSessionHost}.
 */
export function acuiUnregisterDrawStyleSessionHost(view: AcEdBaseView): void {
  sessionHosts.delete(view)
}

/**
 * Makes `command.createSessionAccessory` return the view's draw-style controls.
 *
 * Sets the host session kind from the command's global name so color / font-size
 * sync and apply target the measure or markup store while the command runs.
 *
 * @param command - Command that should expose color / font-size session UI.
 */
export function acuiBindDrawStyleSessionAccessory(command: {
  globalName?: string
  createSessionAccessory: (
    context: AcApContext
  ) => AcEdSessionAccessory | null
}): void {
  command.createSessionAccessory = context => {
    const host = sessionHosts.get(context.view)
    if (!host) return null
    host.setActiveKind(acapDrawStyleKindForCommand(command.globalName))
    return host.createSessionAccessory()
  }
}
