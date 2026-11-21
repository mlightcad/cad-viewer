/**
 * Framework-free tab strip for dialogs and plugin panels.
 *
 * Import {@link AcUiTabs} from `@mlightcad/cad-simple-viewer`. The host
 * supplies each panel; this class only shows the selected one. Inactive
 * panels stay in the DOM with the `hidden` attribute, including panels that
 * set their own `display`.
 */

const STYLE_ID = 'ml-ui-tabs-styles'

/** One page in an {@link AcUiTabs} strip. */
export interface AcUiTab {
  /** Stable id passed to {@link AcUiTabs.select} and the change callback. */
  id: string
  /** Text on the tab button. */
  label: string
  /** Content shown while this tab is selected. */
  panel: HTMLElement
}

/** Options for {@link AcUiTabs}. */
export interface AcUiTabsOptions {
  /** Tabs in display order. */
  tabs: readonly AcUiTab[]
  /** Id of the tab selected when the strip is created. */
  initialId: string
  /**
   * Called after the user selects a different enabled tab.
   * Not called when {@link AcUiTabs.select} or {@link AcUiTabs.setEnabled}
   * moves the selection.
   */
  onChange?: (id: string) => void
}

/**
 * Tab buttons plus the panels supplied by the caller.
 *
 * Append {@link AcUiTabs.root} where the strip should appear. Disable a tab
 * with {@link AcUiTabs.setEnabled}; a disabled tab that was selected moves
 * to the first enabled tab.
 */
export class AcUiTabs {
  /** Element that contains the tab bar and the panels. */
  readonly root: HTMLDivElement

  private readonly tabs: readonly AcUiTab[]
  private readonly onChange?: (id: string) => void
  private readonly buttons = new Map<string, HTMLButtonElement>()
  private readonly panels = new Map<string, HTMLElement>()
  private active: string

  constructor(options: AcUiTabsOptions) {
    AcUiTabs.ensureStyles()
    this.tabs = options.tabs
    this.onChange = options.onChange
    this.active = options.initialId

    this.root = document.createElement('div')
    this.root.className = 'ml-ui-tabs'
    const bar = document.createElement('div')
    bar.className = 'ml-ui-tabs-bar'
    bar.setAttribute('role', 'tablist')
    const pages = document.createElement('div')
    pages.className = 'ml-ui-tabs-pages'

    for (const tab of options.tabs) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ml-ui-tabs-tab'
      button.textContent = tab.label
      button.setAttribute('role', 'tab')
      button.addEventListener('click', () => {
        if (button.disabled || tab.id === this.active) return
        this.active = tab.id
        this.paint()
        this.onChange?.(tab.id)
      })
      bar.append(button)
      this.buttons.set(tab.id, button)
      tab.panel.classList.add('ml-ui-tabs-panel')
      tab.panel.setAttribute('role', 'tabpanel')
      pages.append(tab.panel)
      this.panels.set(tab.id, tab.panel)
    }

    this.root.append(bar, pages)
    this.paint()
  }

  /** Id of the selected tab. */
  activeId(): string {
    return this.active
  }

  /**
   * Selects an enabled tab.
   *
   * @param id - Tab id. A missing or disabled id is ignored.
   */
  select(id: string): void {
    const button = this.buttons.get(id)
    if (!button || button.disabled) return
    this.active = id
    this.paint()
  }

  /**
   * Enables or disables a tab button.
   *
   * @param id - Tab id.
   * @param enabled - `false` prevents selection. The current tab then moves
   *   to the first enabled tab.
   */
  setEnabled(id: string, enabled: boolean): void {
    const button = this.buttons.get(id)
    if (!button) return
    button.disabled = !enabled
    if (!enabled && this.active === id) {
      const fallback = this.tabs.find(
        tab => !this.buttons.get(tab.id)?.disabled
      )
      if (fallback) this.active = fallback.id
    }
    this.paint()
  }

  private paint(): void {
    for (const tab of this.tabs) {
      const selected = tab.id === this.active
      const button = this.buttons.get(tab.id)
      button?.classList.toggle('is-selected', selected)
      button?.setAttribute('aria-selected', selected ? 'true' : 'false')
      const panel = this.panels.get(tab.id)
      if (panel) panel.hidden = !selected
    }
  }

  /** Injects the shared tab CSS once per document. */
  static ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.ml-ui-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.ml-ui-tabs-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--ml-ui-border, #dcdfe6);
}
.ml-ui-tabs-tab {
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--ml-ui-text-muted, #606266);
  cursor: pointer;
  font-size: 12px;
  padding: 6px 10px;
}
.ml-ui-tabs-tab.is-selected {
  color: var(--ml-ui-accent, #0b84ff);
  border-bottom-color: var(--ml-ui-accent, #0b84ff);
}
.ml-ui-tabs-tab:disabled {
  opacity: 0.45;
  cursor: default;
}
.ml-ui-tabs-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.ml-ui-tabs-panel[hidden] {
  display: none !important;
}
`.trim()
    document.head.appendChild(style)
  }
}
