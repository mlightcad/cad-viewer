import {
  AcApSettingManager,
  type AcApSettingManagerEventArgs
} from '../app/AcApSettingManager'
import type { AcEdCommandStack } from '../editor/command/AcEdCommandStack'
import {
  ACED_DRAW_STYLE_SESSION_PROVIDER_ID,
  type AcEdSessionAccessory
} from '../editor/command/AcEdSessionAccessory'
import { acedIsMobileUiLayout } from '../editor/global/AcEdUiLayout'
import {
  type AcUiDrawStyleKind,
  acuiResolveDrawStyleKind,
  acuiShouldShowDrawStyleToolbar
} from '../ui/AcUiDrawStyle'
import { AcUiDrawStyleSessionAccessory } from '../ui/AcUiDrawStyleSessionAccessory'
import {
  ACED_SHORTCUT_TOOLBAR_PROVIDER_ID,
  AcUiShortCutToolbar
} from '../ui/AcUiShortCutToolbar'
import { acapDrawStyleKindForCommand } from '../util/AcApCommandUtil'
import type { AcTrView2d } from '../view'
import type { AcApDrawStyleSessionInstallContext } from './AcApDrawStyleSession'
import { acapBindShortCutToolbarDocState } from './AcApShortCutToolbarDocBind'
import { getMarkupStore } from './markup/AcApMarkupStore'
import {
  getSelectedMeasurementId,
  subscribeMeasurementSelection
} from './measure/AcApMeasurementStore'

/**
 * Registers draw-style controls, shortcut toolbar, and selection-driven
 * shortcut embedding for a view.
 *
 * Idempotent: safe to call from both measure and markup command registration.
 * The provider is stored on {@link AcEdBaseView.sessionProviders} under
 * {@link ACED_DRAW_STYLE_SESSION_PROVIDER_ID}.
 *
 * @param ctx - View and command stack for this document.
 * @returns The view's draw-style session accessory host.
 */
export function acapInstallDrawStyleSessionAccessory(
  ctx: AcApDrawStyleSessionInstallContext
): AcUiDrawStyleSessionAccessory {
  const existing = ctx.view.sessionProviders.get<AcUiDrawStyleSessionAccessory>(
    ACED_DRAW_STYLE_SESSION_PROVIDER_ID
  )
  if (existing) return existing

  ensureShortCutToolbar(ctx.view)

  const host = new AcUiDrawStyleSessionAccessory(ctx.view)
  host.setSelectionUnsubscribe(
    bindSelectionSessionAccessory(ctx.view, ctx.commandManager, host)
  )
  ctx.view.sessionProviders.set(ACED_DRAW_STYLE_SESSION_PROVIDER_ID, host)
  return host
}

/**
 * Returns the draw-style session provider installed for a view, if any.
 *
 * @param view - View passed to {@link acapInstallDrawStyleSessionAccessory}.
 * @returns The installed host, or `undefined` when not yet installed.
 */
export function acapGetDrawStyleSessionAccessory(
  view: AcTrView2d
): AcUiDrawStyleSessionAccessory | undefined {
  return view.sessionProviders.get<AcUiDrawStyleSessionAccessory>(
    ACED_DRAW_STYLE_SESSION_PROVIDER_ID
  )
}

/**
 * Returns the shortcut toolbar installed for a view, if any.
 */
export function acapGetShortCutToolbar(
  view: AcTrView2d
): AcUiShortCutToolbar | undefined {
  return view.sessionProviders.get<AcUiShortCutToolbar>(
    ACED_SHORTCUT_TOOLBAR_PROVIDER_ID
  )
}

/**
 * Ensures a shortcut toolbar exists on the view container.
 */
function ensureShortCutToolbar(view: AcTrView2d): AcUiShortCutToolbar {
  const existing = view.sessionProviders.get<AcUiShortCutToolbar>(
    ACED_SHORTCUT_TOOLBAR_PROVIDER_ID
  )
  if (existing) return existing
  const toolbar = new AcUiShortCutToolbar({ container: view.container })
  const unbindDoc = acapBindShortCutToolbarDocState(toolbar)
  const originalDispose = toolbar.dispose.bind(toolbar)
  toolbar.dispose = () => {
    unbindDoc()
    originalDispose()
  }
  view.sessionProviders.set(ACED_SHORTCUT_TOOLBAR_PROVIDER_ID, toolbar)
  return toolbar
}

/**
 * Keeps draw-style controls embedded in the shortcut toolbar.
 *
 * Mounts the shared draw-style controls into {@link AcUiShortCutToolbar.accessoryHost}
 * when a measure/markup overlay is selected, or when a draw command is active on
 * desktop layout. On mobile, an active draw command uses the session-panel slot
 * instead; this binder clears the shortcut accessory in that case.
 * Never uses the desktop top-center selection chrome.
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
  const shortcut = ensureShortCutToolbar(view)
  let selectionMounted = false
  let selectionInner: AcEdSessionAccessory | null = null

  const unmountSelection = () => {
    if (!selectionMounted) return
    selectionInner?.unmount()
    selectionInner = null
    selectionMounted = false
    shortcut.setAccessoryActive(false)
  }

  const mountSelection = () => {
    if (selectionMounted) return
    selectionInner = host.createSessionAccessory()
    selectionInner.mount({
      host: shortcut.accessoryHost,
      type: 'desktop',
      view
    })
    selectionMounted = true
    shortcut.setAccessoryActive(true)
  }

  /** Syncs active kind and selection accessory visibility from current state. */
  const sync = () => {
    const kind = resolveKind(commandManager)
    host.setActiveKind(kind)

    // Never use legacy desktop selection chrome.
    view.selectionSessionAccessory = null
    // Prefer the shared controls slot over icon-button extensions.
    shortcut.setExtensionItems([])

    const commandActive =
      acapDrawStyleKindForCommand(commandManager.activeCommand?.globalName) !=
      null

    const measureSelected = getSelectedMeasurementId() != null
    const markupSelected = getMarkupStore().selectedId != null
    const selected = measureSelected || markupSelected

    // Desktop draw commands share the shortcut slot with selection styling.
    // Mobile draw commands use the session panel — clear the shortcut slot so
    // the shared controls row can remount there (and remount on shortcut after).
    const showOnShortcut =
      shortcut.isVisible &&
      kind != null &&
      acuiShouldShowDrawStyleToolbar(kind) &&
      ((commandActive && !acedIsMobileUiLayout()) ||
        (!commandActive && selected))

    if (showOnShortcut) {
      mountSelection()
    } else {
      unmountSelection()
    }
  }

  const offMarkup = getMarkupStore().subscribe(sync)
  const offMeasure = subscribeMeasurementSelection(sync)
  const onSettingsModified = (args: AcApSettingManagerEventArgs) => {
    if (args.key === 'isShowRibbon' || args.key === 'isShowShortCutToolbar') {
      sync()
    }
  }
  const onCommandWillStart = () => sync()
  const onCommandEnded = () => {
    // `activeCommand` is cleared after `commandEnded` in runActive; defer remount.
    queueMicrotask(() => sync())
  }
  AcApSettingManager.instance.events.modified.addEventListener(
    onSettingsModified
  )
  view.editor.events.commandWillStart.addEventListener(onCommandWillStart)
  view.editor.events.commandEnded.addEventListener(onCommandEnded)
  sync()

  return () => {
    offMarkup()
    offMeasure()
    AcApSettingManager.instance.events.modified.removeEventListener(
      onSettingsModified
    )
    view.editor.events.commandWillStart.removeEventListener(onCommandWillStart)
    view.editor.events.commandEnded.removeEventListener(onCommandEnded)
    unmountSelection()
    shortcut.setExtensionItems([])
    if (view.selectionSessionAccessory) {
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
