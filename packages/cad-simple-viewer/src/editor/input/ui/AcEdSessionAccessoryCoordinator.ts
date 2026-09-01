import type { AcApContext } from '../../../app/AcApContext'
import { acuiFilterDesktopCommandSessionAccessory } from '../../../ui/AcUiDrawStyle'
import type { AcEdCommandStack } from '../../command/AcEdCommandStack'
import type { AcEdSessionAccessory } from '../../command/AcEdSessionAccessory'
import { acedSubscribeUiLayout } from '../../global/AcEdUiLayout'
import type { AcEdBaseView } from '../../view/AcEdBaseView'
import type { AcEdCommandEventArgs } from '../AcEditor'
import { AcEdDesktopSessionAccessoryChrome } from './AcEdDesktopSessionAccessoryChrome'
import type { AcEdMobileCommandChrome } from './AcEdMobileCommandChrome'
import type {
  AcEdSessionAccessorySlot,
  AcEdSessionAccessorySource
} from './AcEdSessionAccessorySource'

/** Dependencies for {@link AcEdSessionAccessoryCoordinator}. */
export interface AcEdSessionAccessoryCoordinatorOptions {
  view: AcEdBaseView
  getContext: () => AcApContext
  commandManager: AcEdCommandStack
  desktopChrome: AcEdDesktopSessionAccessoryChrome
  mobileChrome: AcEdMobileCommandChrome
  isMobilePromptOpen: () => boolean
}

/** Registered fallback source and its change subscription teardown. */
interface RegisteredSource {
  source: AcEdSessionAccessorySource
  unsubscribe: () => void
}

/**
 * Chooses when and where to mount {@link AcEdSessionAccessory} widgets on
 * desktop (top-center slot) and phone/pad (session panel).
 *
 * Owns command lifecycle: listens for command start/end and mounts
 * `activeCommand.createSessionAccessory()`. Fallback
 * {@link AcEdSessionAccessorySource} implementations cover selection-only
 * and other non-command cases.
 */
export class AcEdSessionAccessoryCoordinator {
  private readonly view: AcEdBaseView
  private readonly getContext: () => AcApContext
  private readonly commandManager: AcEdCommandStack
  private readonly desktopChrome: AcEdDesktopSessionAccessoryChrome
  private readonly mobileChrome: AcEdMobileCommandChrome
  private readonly isMobilePromptOpen: () => boolean

  private readonly sources: RegisteredSource[] = []
  private disposed = false
  private readonly unsubscribeUiLayout: () => void
  private readonly onCommandWillStart: (args: AcEdCommandEventArgs) => void
  private readonly onCommandEnded: () => void

  constructor(options: AcEdSessionAccessoryCoordinatorOptions) {
    this.view = options.view
    this.getContext = options.getContext
    this.commandManager = options.commandManager
    this.desktopChrome = options.desktopChrome
    this.mobileChrome = options.mobileChrome
    this.isMobilePromptOpen = options.isMobilePromptOpen

    this.onCommandWillStart = (_args: AcEdCommandEventArgs) => this.refresh()
    this.onCommandEnded = () => {
      // clearActive runs after commandEnded; refresh on the next microtask.
      queueMicrotask(() => this.refresh())
    }

    this.view.editor.events.commandWillStart.addEventListener(
      this.onCommandWillStart
    )
    this.view.editor.events.commandEnded.addEventListener(this.onCommandEnded)
    this.unsubscribeUiLayout = acedSubscribeUiLayout(() => this.refresh())
  }

  /**
   * Registers a fallback accessory source consulted when the active command
   * does not provide an accessory. Earlier sources win.
   *
   * @param source - Source to consult during {@link refresh}.
   * @returns Function that unregisters this source.
   */
  addSource(source: AcEdSessionAccessorySource): () => void {
    const entry: RegisteredSource = {
      source,
      unsubscribe: source.subscribe(() => this.refresh())
    }
    this.sources.push(entry)
    this.refresh()
    return () => {
      const index = this.sources.indexOf(entry)
      if (index === -1) return
      entry.unsubscribe()
      entry.source.dispose?.()
      this.sources.splice(index, 1)
      this.refresh()
    }
  }

  /** Recomputes accessory placement for the active slot. */
  refresh(): void {
    if (this.disposed) return

    const mobileOpen = this.isMobilePromptOpen()
    if (mobileOpen) {
      this.desktopChrome.setAccessory(null)
      this.mobileChrome.setSessionAccessory(this.resolve('mobile'))
      return
    }

    this.mobileChrome.setSessionAccessory(null)
    this.desktopChrome.setAccessory(this.resolve('desktop'))
  }

  /**
   * Resolves the accessory for the slot that would be used right now.
   *
   * Mirrors the old {@link AcEdInputManager.resolveSessionAccessory} entry point.
   */
  resolveForCurrentSlot(): AcEdSessionAccessory | null {
    const slot: AcEdSessionAccessorySlot = this.isMobilePromptOpen()
      ? 'mobile'
      : 'desktop'
    return this.resolve(slot)
  }

  /** Detaches listeners, clears slots, and drops registered sources. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.view.editor.events.commandWillStart.removeEventListener(
      this.onCommandWillStart
    )
    this.view.editor.events.commandEnded.removeEventListener(this.onCommandEnded)
    while (this.sources.length > 0) {
      const entry = this.sources.pop()!
      entry.unsubscribe()
      entry.source.dispose?.()
    }
    this.unsubscribeUiLayout()
    this.desktopChrome.setAccessory(null)
    this.mobileChrome.setSessionAccessory(null)
  }

  private resolve(slot: AcEdSessionAccessorySlot): AcEdSessionAccessory | null {
    const context = this.getContext()
    const active = this.commandManager.activeCommand
    const fromCommand = active?.createSessionAccessory(context) ?? null
    if (fromCommand) {
      const filtered = acuiFilterDesktopCommandSessionAccessory(
        slot,
        active?.globalName,
        fromCommand
      )
      if (filtered) return filtered
    }

    for (const { source } of this.sources) {
      const accessory = source.resolve({ slot, context })
      if (accessory) return accessory
    }
    return null
  }
}
