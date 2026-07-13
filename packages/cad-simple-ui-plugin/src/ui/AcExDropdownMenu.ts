import { createIconElement } from '../assets/icons'
import type { AcExToolbarItem } from '../config/types'
import type { AcExI18n } from '../i18n'

/**
 * Fixed-position dropdown menu for toolbar submenu items.
 *
 * Closes on outside click and positions itself near the anchor button.
 */
export class AcExDropdownMenu {
  /** Menu root element appended to the theme host. */
  private root: HTMLDivElement
  /** Handler invoked when a menu item is chosen. */
  private onSelect?: (item: AcExToolbarItem) => void
  /** Handler invoked when the menu is closed. */
  private onClose?: () => void
  /** Closes the menu when the user clicks outside. */
  private handleDocumentClick = (event: MouseEvent) => {
    if (!(event.target instanceof Node)) return
    if (this.root.contains(event.target)) return
    this.close()
  }

  /**
   * @param i18n - i18n helper for item labels.
   * @param items - Submenu items to render.
   * @param anchor - Toolbar button used for positioning.
   * @param themeHost - Theme host so `--ml-ui-*` CSS variables are inherited.
   */
  constructor(
    private i18n: AcExI18n,
    items: AcExToolbarItem[],
    anchor: HTMLElement,
    private themeHost: HTMLElement
  ) {
    this.root = document.createElement('div')
    this.root.className = 'ml-ex-ui-dropdown'
    this.root.setAttribute('role', 'menu')

    items.forEach(item => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ml-ex-ui-dropdown-item'
      button.setAttribute('role', 'menuitem')
      if (item.icon) {
        button.appendChild(createIconElement(item.icon))
      }
      const label = document.createElement('span')
      label.textContent = item.label ? this.i18n.t(item.label) : item.id
      button.appendChild(label)
      button.addEventListener('click', event => {
        event.stopPropagation()
        this.onSelect?.(item)
        this.close()
      })
      this.root.appendChild(button)
    })

    this.themeHost.appendChild(this.root)
    this.positionNear(anchor)
    document.addEventListener('mousedown', this.handleDocumentClick, true)
  }

  /**
   * Sets the callback invoked when a menu item is selected.
   *
   * @param handler - Selection handler.
   */
  setOnSelect(handler: (item: AcExToolbarItem) => void) {
    this.onSelect = handler
  }

  /**
   * Sets the callback invoked when the menu closes.
   *
   * @param handler - Close handler.
   */
  setOnClose(handler: () => void) {
    this.onClose = handler
  }

  /** Detaches the menu and removes the document click listener. */
  close() {
    document.removeEventListener('mousedown', this.handleDocumentClick, true)
    this.root.remove()
    this.onClose?.()
  }

  /**
   * Positions the menu below the anchor, flipping above when near the viewport edge.
   *
   * @param anchor - Reference button bounding box.
   */
  private positionNear(anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect()
    const menuRect = this.root.getBoundingClientRect()
    let top = rect.bottom + 4
    let left = rect.left

    if (top + menuRect.height > window.innerHeight - 8) {
      top = rect.top - menuRect.height - 4
    }
    if (left + menuRect.width > window.innerWidth - 8) {
      left = window.innerWidth - menuRect.width - 8
    }

    this.root.style.top = `${Math.max(8, top)}px`
    this.root.style.left = `${Math.max(8, left)}px`
  }
}
