import { AcApSettingManager } from '../app/AcApSettingManager'
import { AcEdSessionAccessoryMountSkippedError } from '../editor/command/AcEdCommand'
import {
  ACED_DRAW_STYLE_SESSION_PROVIDER_ID,
  type AcEdDrawStyleSessionHost,
  type AcEdSessionAccessory,
  type AcEdSessionAccessoryOptions
} from '../editor/command/AcEdSessionAccessory'
import {
  type AcApDrawStyleKind,
  acapDrawStyleKindForCommand
} from '../util/AcApCommandUtil'
import {
  ACED_SHORTCUT_TOOLBAR_PROVIDER_ID,
  type AcUiShortCutToolbar
} from './AcUiShortCutToolbar'

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
 * Assigns `command.sessionAccessory` so trigger mounts the view's draw-style controls.
 *
 * Sets the host session kind from the command's global name so color / font-size
 * sync and apply target the measure or markup store while the command runs.
 * Desktop mounts are suppressed when the ribbon already exposes the same UI, or
 * when the shortcut toolbar is visible (it owns the desktop draw-style slot).
 * Mobile mounts still target the session-panel accessory host.
 *
 * @param command - Command that should expose color / font-size session UI.
 */
export function acuiBindDrawStyleSessionAccessory(command: {
  /** Global command name used to resolve measure vs markup. */
  globalName?: string
  /** Session accessory slot assigned by this binder. */
  sessionAccessory: AcEdSessionAccessory | null
}): void {
  /** Inner accessory created from the view host while mounted. */
  let inner: AcEdSessionAccessory | null = null

  command.sessionAccessory = {
    id: 'draw-style',
    /**
     * Resolves the view host, applies session kind, and mounts controls.
     *
     * @param options - Host element, slot type, and owning view.
     * @throws {AcEdSessionAccessoryMountSkippedError} When there is no host,
     *   desktop ribbon already covers the same UI, or the shortcut toolbar
     *   owns the desktop slot.
     */
    mount(options: AcEdSessionAccessoryOptions) {
      const host = options.view.sessionProviders.get<AcEdDrawStyleSessionHost>(
        ACED_DRAW_STYLE_SESSION_PROVIDER_ID
      )
      if (!host) {
        throw new AcEdSessionAccessoryMountSkippedError()
      }

      const kind = acapDrawStyleKindForCommand(command.globalName)
      host.setActiveKind(kind)

      if (options.type === 'desktop') {
        const shortcut = options.view.sessionProviders.get<AcUiShortCutToolbar>(
          ACED_SHORTCUT_TOOLBAR_PROVIDER_ID
        )
        // Shortcut binder mounts draw-style on desktop; skip top-center chrome.
        if (shortcut?.isVisible) {
          throw new AcEdSessionAccessoryMountSkippedError()
        }
        if (!acuiShouldShowDrawStyleToolbar(kind)) {
          throw new AcEdSessionAccessoryMountSkippedError()
        }
      }

      inner = host.createSessionAccessory()
      inner.mount(options)
    },
    /** Unmounts the inner host accessory created during {@link mount}. */
    unmount() {
      inner?.unmount()
      inner = null
    }
  }
}
