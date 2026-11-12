import {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  resolveUiTheme
} from '../editor/global/AcEdUiTheme'
import type { AcApFindViewInsets } from '../find/AcApFindNavigator'
import { AcApI18n } from '../i18n/AcApI18n'
import { AcUiDockPanel } from '../ui/dock/AcUiDockPanel'

/** Panel content a command shows in the host UI's palette. */
export interface AcApPaletteContent {
  /** Stable id of the palette tab (one tab per id). */
  id: string
  /** Localized tab / panel title. */
  title: string
  /** Framework-free panel content. The host only mounts it. */
  element: HTMLElement
}

/** Handle returned by {@link AcApPaletteHost.show}. */
export interface AcApPaletteHostHandle {
  /** Removes the content from the palette and restores the palette state. */
  close(): void
}

/**
 * Well-known host-owned palette / dock tabs. Hosts map these to their own
 * tab ids (e.g. cad-editor `layerManager` ↔ {@link ACAP_PALETTE_NAMED_TAB.layers}).
 */
export const ACAP_PALETTE_NAMED_TAB = {
  layers: 'layers',
  find: 'find',
  review: 'review',
  measurements: 'measurements',
  entityProperties: 'entityProperties',
  blocks: 'blocks',
  countList: 'countList',
  missingResources: 'missingResources',
  memoryProfile: 'memoryProfile',
  openFileProfile: 'openFileProfile'
} as const

/** Named tab id accepted by {@link AcApPaletteService.openNamedTab}. */
export type AcApPaletteNamedTabId =
  (typeof ACAP_PALETTE_NAMED_TAB)[keyof typeof ACAP_PALETTE_NAMED_TAB]

/**
 * Host UI integration for palette tabs. `cad-editor` registers its Vue tool
 * palette; built-in simple UI chrome registers the shared {@link AcUiDockPanel}.
 * Without a host, {@link AcApPaletteService.open} uses a built-in dock fallback;
 * {@link AcApPaletteService.openNamedTab} still requires a host that implements
 * {@link openNamedTab}.
 */
export interface AcApPaletteHost {
  /**
   * Shows `content` as a palette tab and activates it.
   *
   * @param content - Panel to show.
   * @param onUserClose - Must be called when the user closes the palette or
   * the tab, so the command that owns the panel can end.
   * @returns The handle, or `undefined` when the host cannot show panels
   * right now (the built-in docked panel is used instead).
   */
  show(
    content: AcApPaletteContent,
    onUserClose: () => void
  ): AcApPaletteHostHandle | undefined

  /**
   * Opens a host-owned named tab (layers, find, …). Optional: hosts that only
   * support hosted HTMLElement panels may omit this.
   *
   * @param id - Well-known tab id from {@link ACAP_PALETTE_NAMED_TAB}.
   * @returns `true` when the host opened or focused the tab.
   */
  openNamedTab?(id: AcApPaletteNamedTabId | string): boolean
}

/** Options for {@link AcApPaletteService.open}. */
export interface AcApPaletteOpenOptions {
  /**
   * Element the built-in fallback dock is mounted in (usually the view
   * container). Ignored when a host is registered. Defaults to `document.body`.
   */
  container?: HTMLElement
}

/** Open palette panel returned by {@link AcApPaletteService.open}. */
export class AcApPaletteHandle {
  private readonly listeners = new Set<() => void>()
  private hostHandle?: AcApPaletteHostHandle
  private isClosed = false

  /** @internal */
  constructor(readonly content: AcApPaletteContent) {}

  /** Whether the panel was closed (by code or by the user). */
  get closed(): boolean {
    return this.isClosed
  }

  /**
   * Registers a callback run once when the panel closes, whether
   * {@link close} was called or the user closed the palette.
   *
   * @returns Function that removes the callback.
   */
  onClosed(listener: () => void): () => void {
    if (this.isClosed) {
      listener()
      return () => {}
    }
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Removes the panel from the palette. Safe to call more than once. */
  close() {
    if (this.isClosed) return
    this.isClosed = true
    this.hostHandle?.close()
    this.hostHandle = undefined
    for (const listener of [...this.listeners]) {
      try {
        listener()
      } catch (error) {
        console.warn('[AcApPaletteService] onClosed listener failed:', error)
      }
    }
    this.listeners.clear()
  }

  /**
   * Canvas pixels covered by the panel on each side, for framing drawing
   * content next to it (see {@link acapZoomToVisible}).
   *
   * @param canvas - The drawing canvas.
   */
  coveredInsets(canvas: HTMLElement): AcApFindViewInsets | undefined {
    return acapCoveredInsets(canvas, this.content.element)
  }

  /** @internal */
  attach(hostHandle: AcApPaletteHostHandle) {
    this.hostHandle = hostHandle
  }
}

/**
 * Lets commands show non-modal panels (settings, review lists) in the host
 * UI's palette, while the drawing stays interactive.
 *
 * Host applications register an {@link AcApPaletteHost}; without one, panels
 * are shown in a built-in {@link AcUiDockPanel} on the right of the given
 * container (bottom sheet on phones).
 */
export class AcApPaletteService {
  private static currentHost?: AcApPaletteHost
  private static readonly fallbackHost = createDockFallbackHost()
  /**
   * Named-tab opens requested before a host with {@link AcApPaletteHost.openNamedTab}
   * is registered (e.g. while built-in simple UI loads asynchronously).
   */
  private static pendingNamedTabs: string[] = []

  /**
   * Registers the host palette integration.
   *
   * @param host - Host, or `undefined` to fall back to the built-in dock.
   */
  static setHost(host: AcApPaletteHost | undefined) {
    AcApPaletteService.currentHost = host
    if (
      !host?.openNamedTab ||
      AcApPaletteService.pendingNamedTabs.length === 0
    ) {
      return
    }
    const pending = AcApPaletteService.pendingNamedTabs.splice(0)
    for (const id of pending) {
      host.openNamedTab(id)
    }
  }

  /** Whether a host UI registered its own palette. */
  static get hasHost(): boolean {
    return AcApPaletteService.currentHost !== undefined
  }

  /**
   * Shows a panel in the palette.
   *
   * @param content - Panel to show.
   * @param options - Fallback-dock options.
   * @returns Handle to close the panel and learn when the user closed it.
   */
  static open(
    content: AcApPaletteContent,
    options: AcApPaletteOpenOptions = {}
  ): AcApPaletteHandle {
    const handle = new AcApPaletteHandle(content)
    const onUserClose = () => handle.close()
    const hostHandle =
      AcApPaletteService.currentHost?.show(content, onUserClose) ??
      AcApPaletteService.fallbackHost(options.container).show(
        content,
        onUserClose
      )!
    handle.attach(hostHandle)
    return handle
  }

  /**
   * Opens a host-owned named tab when the registered host implements
   * {@link AcApPaletteHost.openNamedTab}. Unlike {@link open}, there is no
   * built-in dock fallback — named tabs need host-owned content (Vue palette
   * or simple-ui dock tabs).
   *
   * When no host is registered yet, the request is queued and flushed on the
   * next {@link setHost} that implements {@link AcApPaletteHost.openNamedTab}
   * (covers the async built-in `simpleUi` load gap).
   *
   * @param id - Well-known tab id (see {@link ACAP_PALETTE_NAMED_TAB}).
   * @returns `true` when the host opened the tab, or when the open was queued;
   * `false` when a host is present but does not support named tabs.
   */
  static openNamedTab(id: AcApPaletteNamedTabId | string): boolean {
    const host = AcApPaletteService.currentHost
    if (host) {
      if (!host.openNamedTab) return false
      return host.openNamedTab(id)
    }
    AcApPaletteService.pendingNamedTabs.push(id)
    return true
  }
}

/**
 * Canvas pixels `panel` covers on the side it overlaps the most, or
 * `undefined` when it does not overlap the canvas.
 *
 * @param canvas - The drawing canvas.
 * @param panel - Any element inside the panel (its own box is used).
 */
export function acapCoveredInsets(
  canvas: HTMLElement,
  panel: HTMLElement
): AcApFindViewInsets | undefined {
  const c = canvas.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  if (p.width === 0 || p.height === 0) return undefined
  if (!(p.right > c.left && p.left < c.right)) return undefined
  if (!(p.bottom > c.top && p.top < c.bottom)) return undefined
  const sides: Array<[keyof AcApFindViewInsets, number]> = [
    ['left', Math.min(c.width, p.right - c.left)],
    ['right', Math.min(c.width, c.right - p.left)],
    ['top', Math.min(c.height, p.bottom - c.top)],
    ['bottom', Math.min(c.height, c.bottom - p.top)]
  ]
  // The panel is docked to the side it covers least deeply (a right dock
  // covers the right edge only, but spans the full height).
  const [side, size] = sides
    .filter(([, value]) => value > 0)
    .sort((a, b) => a[1] - b[1])[0] ?? ['right', 0]
  return size > 0 ? { [side]: size } : undefined
}

/** Per-container dock used when no host is registered. */
interface FallbackDockState {
  dock: AcUiDockPanel
  unsubscribeTheme: () => void
}

const fallbackDocks = new WeakMap<HTMLElement, FallbackDockState>()

/** Built-in host: {@link AcUiDockPanel} with one hosted tab per open panel. */
function createDockFallbackHost() {
  return (container: HTMLElement | undefined): AcApPaletteHost => ({
    show(content, onUserClose) {
      const host = container ?? document.body
      const state = ensureFallbackDock(host)
      const dock = state.dock
      const tabId = `hosted-${content.id}`
      const wasOpen = dock.isOpen
      const previousTab = dock.activeTab
      dock.removeTab(tabId)
      if (
        !dock.addTab({
          id: tabId,
          label: content.title,
          content: content.element
        })
      ) {
        return undefined
      }
      dock.open(tabId)
      const removeListener = dock.addCloseListener(onUserClose)
      return {
        close() {
          removeListener()
          dock.removeTab(tabId)
          if (!wasOpen) dock.close()
          else if (previousTab && previousTab !== tabId) dock.open(previousTab)
          if (!dock.hasTabs) {
            destroyFallbackDock(host)
          }
        }
      }
    }
  })
}

function ensureFallbackDock(host: HTMLElement): FallbackDockState {
  const existing = fallbackDocks.get(host)
  if (existing) return existing

  const applyTheme = () =>
    acedApplyUiTheme(resolveUiTheme(host), host, { isolated: false })
  applyTheme()
  const unsubscribeTheme = acedSubscribeUiTheme(applyTheme)

  const dock = new AcUiDockPanel({
    host,
    t: key => AcApI18n.t(key),
    defaultSide: 'right',
    defaultOpen: false,
    defaultWidth: 340,
    defaultHeight: 280
  })
  const state: FallbackDockState = { dock, unsubscribeTheme }
  fallbackDocks.set(host, state)
  return state
}

function destroyFallbackDock(host: HTMLElement) {
  const state = fallbackDocks.get(host)
  if (!state) return
  state.unsubscribeTheme()
  state.dock.destroy()
  fallbackDocks.delete(host)
}
