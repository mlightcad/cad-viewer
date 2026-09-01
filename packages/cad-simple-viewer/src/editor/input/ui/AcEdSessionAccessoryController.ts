import type { AcCmEventManager } from '@mlightcad/data-model'

import type { AcEdCommand } from '../../command/AcEdCommand'
import type {
  AcEdSessionAccessory,
  AcEdSessionAccessoryEventArgs,
  AcEdSessionAccessoryHostInfo,
  AcEdSessionAccessoryOptions,
  AcEdSessionAccessorySlot
} from '../../command/AcEdSessionAccessory'
import type { AcEdBaseView } from '../../view/AcEdBaseView'
import { AcEdDesktopSessionAccessoryChrome } from './AcEdDesktopSessionAccessoryChrome'
import type { AcEdMobileCommandChrome } from './AcEdMobileCommandChrome'

/** Subset of editor events used by the session accessory controller. */
export interface AcEdSessionAccessoryEditorEvents {
  /** Fired just before a session accessory is mounted. */
  beforeMountSessionAccessory: AcCmEventManager<AcEdSessionAccessoryEventArgs>
  /** Fired after a session accessory has been mounted. */
  afterMountSessionAccessory: AcCmEventManager<AcEdSessionAccessoryEventArgs>
  /** Fired just before a session accessory is unmounted. */
  beforeUnmountSessionAccessory: AcCmEventManager<AcEdSessionAccessoryEventArgs>
  /** Fired after a session accessory has been unmounted. */
  afterUnmountSessionAccessory: AcCmEventManager<AcEdSessionAccessoryEventArgs>
}

/** Currently mounted accessory and the lifecycle that owns it. */
interface MountedState {
  /** Accessory currently in the chrome slot. */
  accessory: AcEdSessionAccessory
  /** Whether the mount was driven by a command or by selection. */
  source: 'command' | 'selection'
  /** Options used for the current mount. */
  options: AcEdSessionAccessoryOptions
  /** Owning command, or `null` for selection-driven mounts. */
  command: AcEdCommand | null
}

/**
 * Owns desktop/mobile accessory chrome shells, resolves the active mount host,
 * and coordinates selection vs command accessory priority.
 */
export class AcEdSessionAccessoryController {
  /** View whose container hosts desktop chrome and appears in mount options. */
  private readonly view: AcEdBaseView
  /** Top-center desktop accessory shell. */
  private readonly desktopChrome: AcEdDesktopSessionAccessoryChrome
  /** Lazy accessor for mobile session-panel chrome. */
  private readonly getMobileChrome: () => AcEdMobileCommandChrome
  /** Whether the mobile session panel is currently open. */
  private readonly isMobilePromptOpen: () => boolean
  /** Editor event bus for mount/unmount notifications. */
  private readonly getEditorEvents: () => AcEdSessionAccessoryEditorEvents

  /** Selection-driven accessory to show when no command accessory is mounted. */
  private selectionAccessory: AcEdSessionAccessory | null = null
  /** Currently mounted accessory state, or `null` when the slot is empty. */
  private mounted: MountedState | null = null
  /** True while a remount or command-over-selection swap is in progress. */
  private remounting = false
  /** Whether editor event listeners have been attached. */
  private bound = false

  /**
   * Tears down a selection mount before a command accessory mounts into the
   * same chrome slot. Must run in `beforeMount` — doing this in `afterMount`
   * would unmount/clear the command accessory that just attached (draw-style
   * selection and command wrappers share one host `unmount`).
   *
   * @param args - Mount event payload from the editor.
   */
  private readonly onBeforeMount = (args: AcEdSessionAccessoryEventArgs) => {
    if (args.source !== 'command') return
    if (this.mounted?.source !== 'selection') return

    this.remounting = true
    try {
      this.unmountMounted()
    } finally {
      this.remounting = false
    }
  }

  /**
   * Records mount state after an accessory mounts and shows the chrome shell.
   *
   * @param args - Mount event payload from the editor.
   */
  private readonly onAfterMount = (args: AcEdSessionAccessoryEventArgs) => {
    if (!args.options) return

    this.prepareChrome(args.options.type)
    this.mounted = {
      accessory: args.accessory,
      source: args.source,
      options: args.options,
      command: args.command
    }
  }

  /**
   * Clears chrome after unmount and remounts the selection accessory when a
   * command accessory ends.
   *
   * @param args - Unmount event payload from the editor.
   */
  private readonly onAfterUnmount = (args: AcEdSessionAccessoryEventArgs) => {
    if (this.remounting) return
    if (this.mounted?.accessory === args.accessory) {
      this.clearChrome(this.mounted.options.type)
      this.mounted = null
    }
    if (args.source === 'command' && this.selectionAccessory) {
      this.mountSelectionAccessory()
    }
  }

  /**
   * @param options.view - Owning view (used in mount options and container).
   * @param options.getMobileChrome - Lazy mobile chrome accessor.
   * @param options.isMobilePromptOpen - Whether the mobile session panel is open.
   * @param options.getEditorEvents - Editor session-accessory event bus.
   */
  constructor(options: {
    view: AcEdBaseView
    getMobileChrome: () => AcEdMobileCommandChrome
    isMobilePromptOpen: () => boolean
    getEditorEvents: () => AcEdSessionAccessoryEditorEvents
  }) {
    this.view = options.view
    this.desktopChrome = new AcEdDesktopSessionAccessoryChrome(
      options.view.container
    )
    this.getMobileChrome = options.getMobileChrome
    this.isMobilePromptOpen = options.isMobilePromptOpen
    this.getEditorEvents = options.getEditorEvents
  }

  /** Wires chrome prepare/clear and selection remount to editor events. */
  bindEditorEvents(): void {
    if (this.bound) return
    this.bound = true
    const events = this.getEditorEvents()
    events.beforeMountSessionAccessory.addEventListener(this.onBeforeMount)
    events.afterMountSessionAccessory.addEventListener(this.onAfterMount)
    events.afterUnmountSessionAccessory.addEventListener(this.onAfterUnmount)
  }

  /** Active mount target for the current desktop / mobile-prompt state. */
  get sessionAccessoryHost(): AcEdSessionAccessoryHostInfo {
    if (this.isMobilePromptOpen()) {
      return {
        host: this.getMobileChrome().accessoryHost,
        type: 'mobile'
      }
    }
    return {
      host: this.desktopChrome.host,
      type: 'desktop'
    }
  }

  /** Selection-driven accessory shown when no command accessory is mounted. */
  get selectionSessionAccessory(): AcEdSessionAccessory | null {
    return this.selectionAccessory
  }

  /**
   * Updates the selection-driven accessory and mounts or unmounts it when no
   * command accessory currently owns the slot.
   *
   * @param value - Accessory to show on selection, or `null` to clear.
   */
  set selectionSessionAccessory(value: AcEdSessionAccessory | null) {
    if (this.selectionAccessory === value) {
      if (value && !this.mounted) {
        this.mountSelectionAccessory()
      }
      return
    }

    const wasMountedSelection =
      this.mounted?.source === 'selection' &&
      this.mounted.accessory === this.selectionAccessory

    if (wasMountedSelection) {
      this.unmountMounted()
    }

    this.selectionAccessory = value

    if (this.mounted?.source === 'command') {
      return
    }

    if (value) {
      this.mountSelectionAccessory()
    }
  }

  /**
   * Remounts the active accessory when the host slot changes (mobile prompt
   * open/close or layout flip).
   */
  remountActiveSessionAccessory(): void {
    if (!this.mounted || this.remounting) return

    const { accessory, source, command, options: prev } = this.mounted
    const next = this.sessionAccessoryHost
    if (prev.host === next.host && prev.type === next.type) return

    this.remounting = true
    try {
      const events = this.getEditorEvents()
      const unmountArgs: AcEdSessionAccessoryEventArgs = {
        command,
        accessory,
        options: prev,
        source
      }
      events.beforeUnmountSessionAccessory.dispatch(unmountArgs)
      accessory.unmount()
      this.clearChrome(prev.type)
      events.afterUnmountSessionAccessory.dispatch(unmountArgs)

      const mountOptions: AcEdSessionAccessoryOptions = {
        host: next.host,
        type: next.type,
        view: this.view
      }
      const mountArgs: AcEdSessionAccessoryEventArgs = {
        command,
        accessory,
        options: mountOptions,
        source
      }
      events.beforeMountSessionAccessory.dispatch(mountArgs)
      accessory.mount(mountOptions)
      events.afterMountSessionAccessory.dispatch(mountArgs)
    } finally {
      this.remounting = false
    }
  }

  /** Tears down chrome and listeners. */
  dispose(): void {
    if (this.bound) {
      const events = this.getEditorEvents()
      events.beforeMountSessionAccessory.removeEventListener(this.onBeforeMount)
      events.afterMountSessionAccessory.removeEventListener(this.onAfterMount)
      events.afterUnmountSessionAccessory.removeEventListener(this.onAfterUnmount)
      this.bound = false
    }
    if (this.mounted) {
      try {
        this.mounted.accessory.unmount()
      } catch {
        // ignore dispose-time unmount errors
      }
      this.clearChrome(this.mounted.options.type)
      this.mounted = null
    }
    this.selectionAccessory = null
    this.desktopChrome.dispose()
  }

  /**
   * Mounts {@link selectionAccessory} on the desktop slot when no command
   * accessory is active. Selection draw-style stays desktop-only.
   */
  private mountSelectionAccessory(): void {
    const accessory = this.selectionAccessory
    if (!accessory || this.mounted?.source === 'command') return

    if (this.mounted?.accessory === accessory) return

    if (this.mounted) {
      this.unmountMounted()
    }

    const hostInfo = this.sessionAccessoryHost
    // Selection draw-style stays desktop-only (matches prior Source behavior).
    if (hostInfo.type === 'mobile') {
      return
    }

    const options: AcEdSessionAccessoryOptions = {
      host: hostInfo.host,
      type: hostInfo.type,
      view: this.view
    }
    const events = this.getEditorEvents()
    const args: AcEdSessionAccessoryEventArgs = {
      command: null,
      accessory,
      options,
      source: 'selection'
    }
    events.beforeMountSessionAccessory.dispatch(args)
    accessory.mount(options)
    events.afterMountSessionAccessory.dispatch(args)
  }

  /** Unmounts the currently mounted accessory and clears its chrome. */
  private unmountMounted(): void {
    if (!this.mounted) return
    const { accessory, source, command, options } = this.mounted
    const events = this.getEditorEvents()
    const args: AcEdSessionAccessoryEventArgs = {
      command,
      accessory,
      options,
      source
    }
    events.beforeUnmountSessionAccessory.dispatch(args)
    accessory.unmount()
    this.clearChrome(options.type)
    this.mounted = null
    events.afterUnmountSessionAccessory.dispatch(args)
  }

  /**
   * Shows the chrome for `type` and clears the opposite slot.
   *
   * @param type - Slot that should become visible.
   */
  private prepareChrome(type: AcEdSessionAccessorySlot): void {
    if (type === 'mobile') {
      this.desktopChrome.clear()
      this.getMobileChrome().prepareAccessory()
      return
    }
    this.getMobileChrome().clearAccessory()
    this.desktopChrome.prepare()
  }

  /**
   * Hides and empties the chrome for `type`.
   *
   * @param type - Slot to clear.
   */
  private clearChrome(type: AcEdSessionAccessorySlot): void {
    if (type === 'mobile') {
      this.getMobileChrome().clearAccessory()
    } else {
      this.desktopChrome.clear()
    }
  }
}
