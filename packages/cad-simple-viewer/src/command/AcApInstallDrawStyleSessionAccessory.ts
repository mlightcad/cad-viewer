import {
  AcApSettingManager,
  type AcApSettingManagerEventArgs
} from '../app/AcApSettingManager'
import type { AcEdCommandStack } from '../editor/command/AcEdCommandStack'
import {
  type AcUiDrawStyleKind,
  acuiResolveDrawStyleKind,
  acuiShouldShowDrawStyleToolbar
} from '../ui/AcUiDrawStyle'
import { AcUiDrawStyleSessionAccessory } from '../ui/AcUiDrawStyleSessionAccessory'
import { acapDrawStyleKindForCommand } from '../util/AcApCommandUtil'
import type { AcTrView2d } from '../view'
import type { AcApDrawStyleSessionInstallContext } from './AcApDrawStyleSession'
import { getMarkupStore } from './markup/AcApMarkupStore'
import {
  getSelectedMeasurementId,
  subscribeMeasurementSelection
} from './measure/AcApMeasurementStore'

/** Per-view install record kept in {@link installs}. */
interface DrawStyleInstallRecord {
  /** Draw-style controls host for the view. */
  host: AcUiDrawStyleSessionAccessory
  /** Tears down selection sync subscriptions. */
  unsubscribe: () => void
}

/** Weak map of views to their one-time draw-style install records. */
const installs = new WeakMap<object, DrawStyleInstallRecord>()

/**
 * Registers draw-style controls and selection-driven session accessory for a view.
 *
 * Idempotent: safe to call from both measure and markup command registration.
 *
 * @param ctx - View and command stack for this document.
 * @returns The view's draw-style session accessory host.
 */
export function acapInstallDrawStyleSessionAccessory(
  ctx: AcApDrawStyleSessionInstallContext
): AcUiDrawStyleSessionAccessory {
  const existing = installs.get(ctx.view)
  if (existing) return existing.host

  const host = new AcUiDrawStyleSessionAccessory(ctx.view)
  const unsubscribe = bindSelectionSessionAccessory(
    ctx.view,
    ctx.commandManager,
    host
  )
  installs.set(ctx.view, { host, unsubscribe })
  return host
}

/**
 * Returns the draw-style session accessory installed for a view, if any.
 *
 * @param view - View passed to {@link acapInstallDrawStyleSessionAccessory}.
 * @returns The installed host, or `undefined` when not yet installed.
 */
export function acapGetDrawStyleSessionAccessory(
  view: AcTrView2d
): AcUiDrawStyleSessionAccessory | undefined {
  return installs.get(view)?.host
}

/**
 * Keeps `view.selectionSessionAccessory` in sync with markup/measure selection
 * and ribbon visibility (desktop-only, matching the former Source behavior).
 *
 * @param view - View whose selection accessory is updated.
 * @param commandManager - Stack used to detect an active draw command.
 * @param host - Draw-style controls host that builds the accessory.
 * @returns Cleanup that unsubscribes stores/settings and clears the accessory.
 */
function bindSelectionSessionAccessory(
  view: AcTrView2d,
  commandManager: AcEdCommandStack,
  host: AcUiDrawStyleSessionAccessory
): () => void {
  const accessory = host.createSessionAccessory()

  /** Syncs active kind and selection accessory visibility from current state. */
  const sync = () => {
    const kind = resolveKind(commandManager)
    host.setActiveKind(kind)

    if (view.sessionAccessoryHost.type === 'mobile') {
      view.selectionSessionAccessory = null
      return
    }

    if (kind == null || !acuiShouldShowDrawStyleToolbar(kind)) {
      view.selectionSessionAccessory = null
      return
    }

    view.selectionSessionAccessory = accessory
  }

  const offMarkup = getMarkupStore().subscribe(sync)
  const offMeasure = subscribeMeasurementSelection(sync)
  const onSettingsModified = (args: AcApSettingManagerEventArgs) => {
    if (args.key === 'isShowRibbon') sync()
  }
  AcApSettingManager.instance.events.modified.addEventListener(
    onSettingsModified
  )
  sync()

  return () => {
    offMarkup()
    offMeasure()
    AcApSettingManager.instance.events.modified.removeEventListener(
      onSettingsModified
    )
    if (view.selectionSessionAccessory === accessory) {
      view.selectionSessionAccessory = null
    }
  }
}

/**
 * Resolves the draw-style session kind from the active command and overlay selection.
 *
 * @param commandManager - Stack whose active command may own measure/markup.
 * @returns `'measure'` or `'markup'`, or `undefined` when the accessory should hide.
 */
function resolveKind(
  commandManager: AcEdCommandStack
): AcUiDrawStyleKind | undefined {
  return acuiResolveDrawStyleKind({
    commandKind: acapDrawStyleKindForCommand(
      commandManager.activeCommand?.globalName
    ),
    markupSelected: getMarkupStore().selectedId != null,
    measurementSelected: getSelectedMeasurementId() != null
  })
}
