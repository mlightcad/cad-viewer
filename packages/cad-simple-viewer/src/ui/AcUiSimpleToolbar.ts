/**
 * Lightweight themed icon toolbar with overflow menu and horizontal/vertical layout.
 *
 * @module AcUiSimpleToolbar
 * @packageDocumentation
 */

import { acedApplyUiTheme, resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { createIconElement, ICON_MORE } from './icons'

/** Toolbar item used by {@link AcUiSimpleToolbar}. */
export interface AcUiSimpleToolbarItem {
  /** Stable id used for updates and overflow tracking. */
  id: string
  /** Inline SVG, element, or factory. */
  icon: string | HTMLElement | (() => HTMLElement)
  /** Visible label in the overflow menu. */
  label: string
  /** Tooltip / aria-label; defaults to {@link label}. */
  title?: string
  /** Click handler. */
  onClick: (event: MouseEvent) => void
  /** When true, the button is disabled. */
  disabled?: boolean
  /** When false, the item is omitted. Defaults to true. */
  visible?: boolean
}

/** Options for constructing {@link AcUiSimpleToolbar}. */
export interface AcUiSimpleToolbarOptions {
  /** Mount host; toolbar root is appended here. */
  host: HTMLElement
  /** Initial items (core + optional extensions may be set later). */
  items?: AcUiSimpleToolbarItem[]
  /** Layout direction. @defaultValue `'horizontal'` */
  orientation?: 'horizontal' | 'vertical'
  /** Extra CSS class names on the root. */
  className?: string
  /** Accessible name for the overflow button. @defaultValue `'More'` */
  moreLabel?: string
}

const STYLE_ID = 'ml-ui-simple-toolbar-styles'

const TOOLBAR_CSS = `
  .ml-ui-simple-toolbar {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    box-sizing: border-box;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 6px;
    background: var(--ml-ui-bg, rgba(255, 255, 255, 0.96));
    box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
    color: var(--ml-ui-text, #303133);
    --ml-ui-simple-toolbar-btn-size: 32px;
    max-width: 100%;
    max-height: 100%;
    pointer-events: auto;
  }
  .ml-ui-simple-toolbar[hidden] {
    display: none !important;
  }
  .ml-ui-simple-toolbar.is-horizontal {
    flex-direction: row;
    align-items: center;
  }
  .ml-ui-simple-toolbar.is-vertical {
    flex-direction: column;
    align-items: stretch;
  }
  .ml-ui-simple-toolbar__track {
    display: flex;
    gap: 4px;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }
  .ml-ui-simple-toolbar.is-horizontal .ml-ui-simple-toolbar__track {
    flex-direction: row;
    align-items: center;
    flex: 1 1 auto;
  }
  .ml-ui-simple-toolbar.is-vertical .ml-ui-simple-toolbar__track {
    flex-direction: column;
    align-items: stretch;
    flex: 1 1 auto;
  }
  .ml-ui-simple-toolbar__btn {
    position: relative;
    flex: 0 0 auto;
    width: var(--ml-ui-simple-toolbar-btn-size);
    height: var(--ml-ui-simple-toolbar-btn-size);
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    box-sizing: border-box;
  }
  .ml-ui-simple-toolbar__btn:hover:not(:disabled) {
    background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
    border-color: var(--ml-ui-border, #dcdfe6);
  }
  .ml-ui-simple-toolbar__btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .ml-ui-simple-toolbar__btn .ml-ex-ui-icon,
  .ml-ui-simple-toolbar__btn .ml-ui-simple-toolbar__icon {
    display: inline-flex;
    width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
  }
  .ml-ui-simple-toolbar__btn .ml-ex-ui-icon svg,
  .ml-ui-simple-toolbar__btn .ml-ui-simple-toolbar__icon svg {
    width: 18px;
    height: 18px;
  }
  .ml-ui-simple-toolbar__overflow-btn[hidden] {
    display: none !important;
  }
  .ml-ui-simple-toolbar__menu {
    position: absolute;
    z-index: 60;
    min-width: 160px;
    max-width: min(280px, 90vw);
    padding: 4px;
    margin: 0;
    list-style: none;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 6px;
    background: var(--ml-ui-bg, #fff);
    box-shadow: var(--ml-ui-shadow, 0 4px 12px rgba(0, 0, 0, 0.16));
    color: var(--ml-ui-text, #303133);
  }
  .ml-ui-simple-toolbar__menu[hidden] {
    display: none !important;
  }
  .ml-ui-simple-toolbar__menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13px;
    text-align: start;
    cursor: pointer;
    box-sizing: border-box;
  }
  .ml-ui-simple-toolbar__menu-item:hover:not(:disabled) {
    background: var(--ml-ui-accent-soft, rgba(64, 158, 255, 0.12));
  }
  .ml-ui-simple-toolbar__menu-item:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .ml-ui-simple-toolbar__menu-item .ml-ex-ui-icon,
  .ml-ui-simple-toolbar__menu-item .ml-ui-simple-toolbar__icon {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .ml-ui-simple-toolbar__menu-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = TOOLBAR_CSS
  document.head.appendChild(style)
}

/**
 * Framework-free icon toolbar with theme tokens and overflow "⋯" menu.
 */
export class AcUiSimpleToolbar {
  /** Outer toolbar root. */
  readonly root: HTMLDivElement

  private readonly host: HTMLElement
  private readonly track: HTMLDivElement
  private readonly overflowButton: HTMLButtonElement
  private readonly menu: HTMLDivElement
  private coreItems: AcUiSimpleToolbarItem[] = []
  private extensionItems: AcUiSimpleToolbarItem[] = []
  private orientation: 'horizontal' | 'vertical'
  private moreLabel: string
  private resizeObserver: ResizeObserver | null = null
  private menuOpen = false
  private readonly onDocumentPointerDown: (event: PointerEvent) => void
  private disposed = false

  /**
   * @param options - Host, items, and layout.
   */
  constructor(options: AcUiSimpleToolbarOptions) {
    ensureStyles()
    this.host = options.host
    this.orientation = options.orientation ?? 'horizontal'
    this.moreLabel = options.moreLabel ?? 'More'
    this.coreItems = [...(options.items ?? [])]

    this.root = document.createElement('div')
    this.root.className = [
      'ml-ui-simple-toolbar',
      this.orientation === 'vertical' ? 'is-vertical' : 'is-horizontal',
      options.className
    ]
      .filter(Boolean)
      .join(' ')
    this.root.setAttribute('role', 'toolbar')
    acedApplyUiTheme(resolveUiTheme(this.host), this.root)

    this.track = document.createElement('div')
    this.track.className = 'ml-ui-simple-toolbar__track'

    this.overflowButton = document.createElement('button')
    this.overflowButton.type = 'button'
    this.overflowButton.className =
      'ml-ui-simple-toolbar__btn ml-ui-simple-toolbar__overflow-btn'
    this.overflowButton.hidden = true
    this.overflowButton.title = this.moreLabel
    this.overflowButton.setAttribute('aria-label', this.moreLabel)
    this.overflowButton.setAttribute('aria-haspopup', 'menu')
    this.overflowButton.setAttribute('aria-expanded', 'false')
    this.overflowButton.appendChild(createIconElement(ICON_MORE))
    this.overflowButton.addEventListener('click', event => {
      event.stopPropagation()
      if (this.overflowButton.hidden) return
      this.toggleMenu()
    })

    this.menu = document.createElement('div')
    this.menu.className = 'ml-ui-simple-toolbar__menu'
    this.menu.setAttribute('role', 'menu')
    this.menu.hidden = true

    this.root.append(this.track, this.overflowButton)
    this.host.appendChild(this.root)
    document.body.appendChild(this.menu)

    this.onDocumentPointerDown = event => {
      if (!this.menuOpen) return
      const target = event.target as Node | null
      if (
        target &&
        (this.menu.contains(target) || this.overflowButton.contains(target))
      ) {
        return
      }
      this.closeMenu()
    }
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true)

    this.render()
    this.setupResizeObserver()
  }

  /**
   * Visible items: extension (e.g. selection style) first, then core,
   * excluding `visible: false`.
   */
  private get visibleItems(): AcUiSimpleToolbarItem[] {
    return [...this.extensionItems, ...this.coreItems].filter(
      item => item.visible !== false
    )
  }

  /**
   * Replaces core items and re-renders.
   *
   * @param items - New core toolbar items.
   */
  setItems(items: AcUiSimpleToolbarItem[]): void {
    this.coreItems = [...items]
    this.render()
  }

  /**
   * Replaces extension items (e.g. selection accessory) prepended before core.
   *
   * @param items - Extension items; pass `[]` to clear.
   */
  setExtensionItems(items: AcUiSimpleToolbarItem[]): void {
    this.extensionItems = [...items]
    this.render()
  }

  /**
   * Patches a single item by id (core or extension).
   *
   * @param id - Item id.
   * @param patch - Partial fields to merge.
   */
  updateItem(
    id: string,
    patch: Partial<Omit<AcUiSimpleToolbarItem, 'id'>>
  ): void {
    const patchList = (list: AcUiSimpleToolbarItem[]) => {
      const index = list.findIndex(item => item.id === id)
      if (index < 0) return false
      list[index] = { ...list[index], ...patch }
      return true
    }
    if (!patchList(this.coreItems) && !patchList(this.extensionItems)) return
    this.render()
  }

  /**
   * Switches horizontal / vertical layout.
   *
   * @param orientation - New orientation.
   */
  setOrientation(orientation: 'horizontal' | 'vertical'): void {
    if (this.orientation === orientation) return
    this.orientation = orientation
    this.root.classList.toggle('is-horizontal', orientation === 'horizontal')
    this.root.classList.toggle('is-vertical', orientation === 'vertical')
    this.layoutOverflow()
  }

  /**
   * Updates the overflow button label.
   *
   * @param label - Accessible / tooltip label.
   */
  setMoreLabel(label: string): void {
    this.moreLabel = label
    this.overflowButton.title = label
    this.overflowButton.setAttribute('aria-label', label)
  }

  /** Shows or hides the whole toolbar. */
  setVisible(visible: boolean): void {
    this.root.hidden = !visible
    if (!visible) this.closeMenu()
  }

  /** Re-applies UI theme tokens from the host ancestry. */
  refreshTheme(): void {
    acedApplyUiTheme(resolveUiTheme(this.host), this.root)
    acedApplyUiTheme(resolveUiTheme(this.host), this.menu)
  }

  /** Tears down listeners, observers, and DOM. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.closeMenu()
    document.removeEventListener(
      'pointerdown',
      this.onDocumentPointerDown,
      true
    )
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.menu.remove()
    this.root.remove()
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      this.layoutOverflow()
      return
    }
    this.resizeObserver = new ResizeObserver(() => this.layoutOverflow())
    this.resizeObserver.observe(this.root)
    if (this.host !== this.root) this.resizeObserver.observe(this.host)
  }

  private render(): void {
    this.closeMenu()
    this.track.replaceChildren()
    for (const item of this.visibleItems) {
      this.track.appendChild(this.createButton(item))
    }
    // Defer overflow measure until buttons have layout.
    requestAnimationFrame(() => this.layoutOverflow())
  }

  private createButton(item: AcUiSimpleToolbarItem): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ml-ui-simple-toolbar__btn'
    button.dataset.toolbarItemId = item.id
    const title = item.title ?? item.label
    button.title = title
    button.setAttribute('aria-label', title)
    button.disabled = Boolean(item.disabled)
    button.appendChild(createIconElement(item.icon))
    button.addEventListener('click', event => {
      event.stopPropagation()
      if (button.disabled) return
      this.closeMenu()
      item.onClick(event)
    })
    return button
  }

  private layoutOverflow(): void {
    if (this.disposed || this.root.hidden) return
    const buttons = Array.from(
      this.track.querySelectorAll<HTMLButtonElement>('.ml-ui-simple-toolbar__btn')
    )
    for (const button of buttons) button.hidden = false
    this.overflowButton.hidden = true
    this.closeMenu()

    if (buttons.length === 0) return

    const horizontal = this.orientation === 'horizontal'
    const gap = 4
    const sizes = buttons.map(button =>
      horizontal ? button.offsetWidth : button.offsetHeight
    )
    const total = sizes.reduce(
      (sum, size, index) => sum + size + (index > 0 ? gap : 0),
      0
    )

    const computed = getComputedStyle(this.root)
    const padding = horizontal
      ? (parseFloat(computed.paddingLeft) || 0) +
        (parseFloat(computed.paddingRight) || 0)
      : (parseFloat(computed.paddingTop) || 0) +
        (parseFloat(computed.paddingBottom) || 0)
    const available =
      (horizontal ? this.root.clientWidth : this.root.clientHeight) - padding

    // Shrink-wrapped toolbars report client size ≈ content; allow 1px rounding.
    if (!(available > 0) || total <= available + 1) return

    const overflowSize = horizontal
      ? this.overflowButton.offsetWidth || 32
      : this.overflowButton.offsetHeight || 32
    const budget = available - overflowSize - gap

    let used = 0
    let firstHidden = buttons.length
    for (let i = 0; i < buttons.length; i++) {
      const next = used + (i > 0 ? gap : 0) + sizes[i]
      if (next > budget && i > 0) {
        firstHidden = i
        break
      }
      used = next
    }

    if (firstHidden >= buttons.length) return

    this.overflowButton.hidden = false
    for (let i = firstHidden; i < buttons.length; i++) {
      buttons[i].hidden = true
    }
  }

  private toggleMenu(): void {
    if (this.menuOpen) this.closeMenu()
    else this.openMenu()
  }

  private openMenu(): void {
    const hiddenButtons = Array.from(
      this.track.querySelectorAll<HTMLButtonElement>(
        '.ml-ui-simple-toolbar__btn[hidden]'
      )
    )
    if (hiddenButtons.length === 0) return

    const itemsById = new Map(this.visibleItems.map(item => [item.id, item]))
    this.menu.replaceChildren()
    for (const button of hiddenButtons) {
      const id = button.dataset.toolbarItemId
      if (!id) continue
      const item = itemsById.get(id)
      if (!item) continue
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'ml-ui-simple-toolbar__menu-item'
      row.setAttribute('role', 'menuitem')
      row.disabled = Boolean(item.disabled)
      row.appendChild(createIconElement(item.icon))
      const label = document.createElement('span')
      label.className = 'ml-ui-simple-toolbar__menu-label'
      label.textContent = item.label
      row.appendChild(label)
      row.addEventListener('click', event => {
        event.stopPropagation()
        if (row.disabled) return
        this.closeMenu()
        item.onClick(event)
      })
      this.menu.appendChild(row)
    }

    acedApplyUiTheme(resolveUiTheme(this.host), this.menu)
    this.menu.hidden = false
    this.menuOpen = true
    this.overflowButton.setAttribute('aria-expanded', 'true')
    this.positionMenu()
  }

  private positionMenu(): void {
    const rect = this.overflowButton.getBoundingClientRect()
    const menuRect = this.menu.getBoundingClientRect()
    let left = rect.left
    let top = rect.bottom + 4
    if (this.orientation === 'vertical') {
      left = rect.right + 4
      top = rect.top
    }
    if (left + menuRect.width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuRect.width - 8)
    }
    if (top + menuRect.height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuRect.height - 4)
    }
    this.menu.style.left = `${left}px`
    this.menu.style.top = `${top}px`
  }

  private closeMenu(): void {
    if (!this.menuOpen && this.menu.hidden) return
    this.menuOpen = false
    this.menu.hidden = true
    this.overflowButton.setAttribute('aria-expanded', 'false')
  }
}
