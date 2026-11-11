import { ML_UI_MOBILE_MAX_WIDTH } from '../editor/global/AcEdUiLayout'
import {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  resolveUiTheme
} from '../editor/global/AcEdUiTheme'
import type { AcApFindViewInsets } from '../find/AcApFindNavigator'

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
 * Host UI integration: shows command panels in the host's palette (the Vue
 * tool palette in `cad-editor`, the dock panel in `cad-simple-ui-plugin`).
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
}

/** Options for {@link AcApPaletteService.open}. */
export interface AcApPaletteOpenOptions {
  /**
   * Element the built-in fallback panel is docked in (usually the view
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
 * are docked on the right of the given container (bottom sheet on phones).
 */
export class AcApPaletteService {
  private static currentHost?: AcApPaletteHost
  private static readonly fallbackHost = createFallbackHost()

  /**
   * Registers the host palette integration.
   *
   * @param host - Host, or `undefined` to fall back to the built-in panel.
   */
  static setHost(host: AcApPaletteHost | undefined) {
    AcApPaletteService.currentHost = host
  }

  /** Whether a host UI registered its own palette. */
  static get hasHost(): boolean {
    return AcApPaletteService.currentHost !== undefined
  }

  /**
   * Shows a panel in the palette.
   *
   * @param content - Panel to show.
   * @param options - Fallback-panel options.
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

const FALLBACK_STYLE_ID = 'ml-palette-fallback-styles'

/** Built-in host: one docked panel per container, one tab at a time. */
function createFallbackHost() {
  return (container: HTMLElement | undefined): AcApPaletteHost => ({
    show(content, onUserClose) {
      ensureFallbackStyles()
      const host = container ?? document.body
      let restorePosition: string | null = null
      if ((getComputedStyle(host).position || 'static') === 'static') {
        restorePosition = host.style.position
        host.style.position = 'relative'
      }
      const root = document.createElement('div')
      root.className = 'ml-palette-fallback'
      root.dataset.paletteId = content.id
      const applyTheme = () =>
        acedApplyUiTheme(resolveUiTheme(host), root, { isolated: true })
      applyTheme()
      const unsubscribe = acedSubscribeUiTheme(applyTheme)

      const header = document.createElement('div')
      header.className = 'ml-palette-fallback__header'
      const title = document.createElement('div')
      title.className = 'ml-palette-fallback__title'
      title.textContent = content.title
      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'ml-palette-fallback__close'
      close.textContent = '×'
      close.setAttribute('aria-label', content.title)
      close.addEventListener('click', () => onUserClose())
      header.append(title, close)

      const body = document.createElement('div')
      body.className = 'ml-palette-fallback__body'
      body.append(content.element)
      root.append(header, body)
      host.append(root)

      return {
        close() {
          unsubscribe()
          root.remove()
          if (restorePosition !== null) host.style.position = restorePosition
        }
      }
    }
  })
}

function ensureFallbackStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(FALLBACK_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = FALLBACK_STYLE_ID
  style.textContent = `
.ml-palette-fallback {
  position: absolute;
  top: 8px;
  right: 8px;
  bottom: 8px;
  width: 340px;
  max-width: calc(100% - 16px);
  z-index: 40;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
  box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.25));
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 12px;
}
.ml-palette-fallback__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
}
.ml-palette-fallback__title {
  font-size: 13px;
  font-weight: 600;
}
.ml-palette-fallback__close {
  border: none;
  background: transparent;
  color: var(--ml-ui-text-muted, #606266);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
}
.ml-palette-fallback__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
@media (max-width: ${ML_UI_MOBILE_MAX_WIDTH}px) {
  .ml-palette-fallback {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    max-width: none;
    height: 50%;
    border-radius: 10px 10px 0 0;
  }
}
`.trim()
  document.head.appendChild(style)
}
