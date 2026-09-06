/**
 * Floating shortcut toolbar (undo / redo / erase) with an extension slot for
 * selection accessories.
 *
 * Keep this module free of {@link AcApDocManager} / markup / measure imports so
 * the offline HTML viewer-runtime can tree-shake it without pulling the full
 * viewer package.
 *
 * @module AcUiShortCutToolbar
 * @packageDocumentation
 */

import {
  AcApSettingManager,
  type AcApSettingManagerEventArgs
} from '../app/AcApSettingManager'
import { ML_UI_Z_SHORTCUT_TOOLBAR } from '../editor/global/AcEdUiLayout'
import {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  resolveUiTheme
} from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n/AcApI18n'
import {
  AcUiSimpleToolbar,
  type AcUiSimpleToolbarItem
} from './AcUiSimpleToolbar'
import { ICON_ERASE, ICON_REDO, ICON_UNDO } from './icons'

const STYLE_ID = 'ml-ui-shortcut-toolbar-styles'

/** Default top inset when no message / status bar is visible. */
export const ACUI_SHORTCUT_TOOLBAR_DEFAULT_TOP_PX = 12

const SHELL_CSS = `
  .ml-ui-shortcut-toolbar-shell {
    position: absolute;
    top: ${ACUI_SHORTCUT_TOOLBAR_DEFAULT_TOP_PX}px;
    right: 12px;
    z-index: ${ML_UI_Z_SHORTCUT_TOOLBAR};
    max-width: calc(100% - 24px);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    box-sizing: border-box;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 6px;
    background: var(--ml-ui-bg, rgba(255, 255, 255, 0.96));
    box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
    color: var(--ml-ui-text, #303133);
    pointer-events: auto;
  }
  .ml-ui-shortcut-toolbar-shell[hidden] {
    display: none !important;
  }
  .ml-ui-shortcut-toolbar-shell .ml-ui-simple-toolbar {
    border: none;
    box-shadow: none;
    background: transparent;
    padding: 0;
    color: inherit;
    flex: 0 0 auto;
    max-width: none;
  }
  .ml-ui-shortcut-accessory {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
  }
  .ml-ui-shortcut-accessory:empty {
    display: none;
  }
  .ml-ui-shortcut-divider {
    display: none;
    width: 1px;
    align-self: stretch;
    margin: 2px 0;
    background: var(--ml-ui-border, #dcdfe6);
    flex: 0 0 auto;
  }
  .ml-ui-shortcut-toolbar-shell.has-accessory .ml-ui-shortcut-divider {
    display: block;
  }
  /* Match simple-toolbar icon buttons: no permanent outer frame. */
  .ml-ui-shortcut-accessory .ml-draw-style-toolbar__controls {
    gap: 4px;
  }
  .ml-ui-shortcut-accessory .ml-draw-style-toolbar__swatch,
  .ml-ui-shortcut-accessory .ml-draw-style-toolbar__text-height {
    width: var(--ml-ui-simple-toolbar-btn-size, 32px);
    height: var(--ml-ui-simple-toolbar-btn-size, 32px);
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
  }
  .ml-ui-shortcut-accessory .ml-draw-style-toolbar__swatch:hover,
  .ml-ui-shortcut-accessory .ml-draw-style-toolbar__text-height:hover {
    background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
    border-color: var(--ml-ui-border, #dcdfe6);
  }
  .ml-ui-shortcut-accessory .ml-draw-style-toolbar__swatch-fill {
    margin: 0 auto;
  }
`

function ensureShellStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = SHELL_CSS
  document.head.appendChild(style)
}

/** Session provider id for {@link AcUiShortCutToolbar}. */
export const ACED_SHORTCUT_TOOLBAR_PROVIDER_ID = 'shortcut-toolbar'

/** Enabled flags for core shortcut actions. */
export interface AcUiShortCutToolbarActionState {
  undo: boolean
  redo: boolean
  erase: boolean
}

/** Options for {@link AcUiShortCutToolbar}. */
export interface AcUiShortCutToolbarOptions {
  /** View / canvas container that receives the shell. */
  container: HTMLElement
  /**
   * Optional CSS top offset (e.g. below a status / message bar).
   * When omitted, {@link ACUI_SHORTCUT_TOOLBAR_DEFAULT_TOP_PX} is used.
   */
  topOffsetPx?: number
  /**
   * When true, visibility is not bound to {@link AcApSettingManager.isShowShortCutToolbar}
   * (used by offline HTML export which always shows the bar).
   */
  forceVisible?: boolean
  /**
   * Command runners. Hosts without DocManager (HTML export) must supply these.
   * When omitted, clicks are no-ops until {@link setActions} is called.
   */
  actions?: {
    undo?: () => void
    redo?: () => void
    erase?: () => void
  }
  /**
   * Enabled-state provider. When omitted, buttons stay enabled until
   * {@link setActionState} / {@link syncActionState} is driven by the host.
   */
  getActionState?: () => AcUiShortCutToolbarActionState
  /** Optional i18n labels (HTML offline viewer). */
  labels?: {
    more?: string
    undo?: string
    redo?: string
    erase?: string
  }
}

/**
 * Positions a simple toolbar at the top-right of a view container and exposes
 * an extension API for selection-driven buttons.
 */
export class AcUiShortCutToolbar {
  /** Absolute shell around the toolbar. */
  readonly shell: HTMLDivElement

  /** Mount point for selection draw-style controls (left of core buttons). */
  readonly accessoryHost: HTMLDivElement

  private readonly divider: HTMLDivElement
  private readonly toolbar: AcUiSimpleToolbar
  private readonly forceVisible: boolean
  private readonly onSettingsModified: (
    args: AcApSettingManagerEventArgs
  ) => void
  private readonly onLocaleChanged = () => this.relabel()
  private actions: NonNullable<AcUiShortCutToolbarOptions['actions']>
  private getActionState:
    | (() => AcUiShortCutToolbarActionState)
    | undefined
  private offTheme: (() => void) | null = null
  private disposed = false

  /**
   * @param options - Container and optional action overrides.
   */
  constructor(private readonly options: AcUiShortCutToolbarOptions) {
    ensureShellStyles()

    if (getComputedStyle(options.container).position === 'static') {
      options.container.style.position = 'relative'
    }

    this.forceVisible = options.forceVisible === true
    this.actions = { ...(options.actions ?? {}) }
    this.getActionState = options.getActionState

    this.shell = document.createElement('div')
    this.shell.className = 'ml-ui-shortcut-toolbar-shell'
    if (options.topOffsetPx != null) {
      this.shell.style.top = `${options.topOffsetPx}px`
    }
    options.container.appendChild(this.shell)

    this.accessoryHost = document.createElement('div')
    this.accessoryHost.className = 'ml-ui-shortcut-accessory'
    this.divider = document.createElement('div')
    this.divider.className = 'ml-ui-shortcut-divider'
    this.divider.setAttribute('aria-hidden', 'true')
    this.shell.append(this.accessoryHost, this.divider)

    this.toolbar = new AcUiSimpleToolbar({
      host: this.shell,
      orientation: 'horizontal',
      className: 'ml-ui-shortcut-toolbar',
      moreLabel:
        options.labels?.more ?? AcApI18n.t('main.shortCutToolbar.more'),
      items: this.buildCoreItems()
    })

    this.onSettingsModified = args => {
      if (args.key === 'isShowShortCutToolbar') this.syncVisibility()
    }
    if (!this.forceVisible) {
      AcApSettingManager.instance.events.modified.addEventListener(
        this.onSettingsModified
      )
    }

    this.offTheme = acedSubscribeUiTheme(() => this.refreshTheme())
    AcApI18n.events.localeChanged.addEventListener(this.onLocaleChanged)

    this.syncVisibility()
    this.refreshTheme()
    this.syncActionState()
  }

  /** Underlying simple toolbar (for advanced callers). */
  get simpleToolbar(): AcUiSimpleToolbar {
    return this.toolbar
  }

  /**
   * Replaces or merges click handlers (used by DocManager host binding).
   *
   * @param actions - Partial action map.
   */
  setActions(actions: NonNullable<AcUiShortCutToolbarOptions['actions']>): void {
    this.actions = { ...this.actions, ...actions }
    this.toolbar.setItems(this.buildCoreItems())
    this.syncActionState()
  }

  /**
   * Replaces the enabled-state provider (used by DocManager host binding).
   *
   * @param getActionState - State resolver, or `undefined` to clear.
   */
  setActionStateProvider(
    getActionState: (() => AcUiShortCutToolbarActionState) | undefined
  ): void {
    this.getActionState = getActionState
    this.syncActionState()
  }

  /**
   * Replaces selection-accessory extension buttons (prepended before core).
   *
   * @param items - Extension items; empty clears.
   */
  setExtensionItems(items: AcUiSimpleToolbarItem[]): void {
    this.toolbar.setExtensionItems(items)
    this.syncActionState()
  }

  /**
   * Whether the shell is currently shown (settings or {@link forceVisible}).
   */
  get isVisible(): boolean {
    return !this.shell.hidden
  }

  /**
   * Marks whether {@link accessoryHost} currently hosts draw-style controls.
   * Drives the divider between accessory and core buttons.
   *
   * @param active - True when draw-style is mounted in the slot.
   */
  setAccessoryActive(active: boolean): void {
    this.shell.classList.toggle('has-accessory', active)
  }

  /**
   * Updates the shell top offset (e.g. when a status bar appears).
   *
   * @param topOffsetPx - CSS top in pixels.
   */
  setTopOffset(topOffsetPx: number): void {
    this.shell.style.top = `${topOffsetPx}px`
  }

  /**
   * Applies enabled/disabled state for undo / redo / erase.
   *
   * @param state - Per-action enabled flags.
   */
  setActionState(state: AcUiShortCutToolbarActionState): void {
    this.toolbar.updateItem('shortcut-undo', { disabled: !state.undo })
    this.toolbar.updateItem('shortcut-redo', { disabled: !state.redo })
    this.toolbar.updateItem('shortcut-erase', { disabled: !state.erase })
  }

  /** Recomputes action enabled state from the configured provider. */
  syncActionState(): void {
    if (this.disposed) return
    if (this.getActionState) {
      this.setActionState(this.getActionState())
      return
    }
    // No provider yet (DocManager bind pending): keep controls usable.
    this.setActionState({ undo: true, redo: true, erase: true })
  }

  /** Reloads core button labels from i18n. */
  relabel(): void {
    if (this.disposed) return
    this.toolbar.setMoreLabel(
      this.options.labels?.more ?? AcApI18n.t('main.shortCutToolbar.more')
    )
    this.toolbar.setItems(this.buildCoreItems())
    this.syncActionState()
  }

  /** Re-applies theme tokens to the shell and inner toolbar. */
  refreshTheme(): void {
    if (this.disposed) return
    acedApplyUiTheme(resolveUiTheme(this.options.container), this.shell)
    this.toolbar.refreshTheme()
  }

  /** Tears down settings listeners and DOM. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (!this.forceVisible) {
      AcApSettingManager.instance.events.modified.removeEventListener(
        this.onSettingsModified
      )
    }
    AcApI18n.events.localeChanged.removeEventListener(this.onLocaleChanged)
    this.offTheme?.()
    this.offTheme = null
    this.toolbar.dispose()
    this.shell.remove()
  }

  private syncVisibility(): void {
    const visible =
      this.forceVisible || AcApSettingManager.instance.isShowShortCutToolbar
    this.shell.hidden = !visible
    this.toolbar.setVisible(visible)
  }

  private buildCoreItems(): AcUiSimpleToolbarItem[] {
    const run = (name: 'undo' | 'redo' | 'erase') => {
      this.actions[name]?.()
    }
    return [
      {
        id: 'shortcut-undo',
        icon: ICON_UNDO,
        label:
          this.options.labels?.undo ?? AcApI18n.t('main.shortCutToolbar.undo'),
        onClick: () => run('undo')
      },
      {
        id: 'shortcut-redo',
        icon: ICON_REDO,
        label:
          this.options.labels?.redo ?? AcApI18n.t('main.shortCutToolbar.redo'),
        onClick: () => run('redo')
      },
      {
        id: 'shortcut-erase',
        icon: ICON_ERASE,
        label:
          this.options.labels?.erase ??
          AcApI18n.t('main.shortCutToolbar.erase'),
        onClick: () => run('erase')
      }
    ]
  }
}
