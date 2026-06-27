import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import { createIconElement } from '../assets/icons'
import {
  filterVisibleToolbarItems,
  isToolbarItemDisabled,
  itemRequiresDocument,
  resolveParentToolbarDisplay
} from '../config/resolveToolbarItems'
import { isToolbarSeparatorItem } from '../config/toolbarItemUtils'
import type { AcExToolbarItem, AcExToolbarPlacement } from '../config/types'
import type { AcExI18n } from '../i18n'
import { AcExDropdownMenu } from './AcExDropdownMenu'
import { ensureUiStyles } from './styles'

/** Constructor options for {@link AcExToolbar}. */
export interface AcExToolbarOptions {
  /** Viewer host element that receives the toolbar root node. */
  host: HTMLElement
  /** Edge placement of the toolbar. */
  placement: AcExToolbarPlacement
  /** Toolbar item definitions to render. */
  items: AcExToolbarItem[]
  /** i18n helper for button labels and tooltips. */
  i18n: AcExI18n
  /** Invoked when a leaf item with a `command` is activated. */
  onCommand: (command: string) => void
}

/**
 * Plain-DOM floating toolbar with dropdown submenus and toggle buttons.
 *
 * Disables command buttons while a document is loading and filters items by
 * document open mode.
 */
export class AcExToolbar {
  /** Root toolbar container appended to the host. */
  private root: HTMLDivElement
  /** Currently open submenu, if any. */
  private openDropdown?: AcExDropdownMenu
  /** Whether the toolbar is globally disabled during document open. */
  private isDisabled = false
  /** Current document open mode used for item visibility. */
  private openMode = AcEdOpenMode.Read
  /** Whether an active document is loaded. */
  private hasDocument = false
  /** Item list last passed to {@link updateItems} or the constructor. */
  private items: AcExToolbarItem[]
  /** Runtime submenu selection for parents with {@link AcExToolbarItem.childIcon} `'selected'`. */
  private selectedChildByParent = new Map<string, string>()

  /** Re-renders buttons when a document becomes active. */
  private handleDocumentActivated = () => {
    this.hasDocument = Boolean(AcApDocManager.instance.curDocument)
    this.isDisabled = false
    this.root.classList.remove('is-disabled')
    this.openMode =
      AcApDocManager.instance.curDocument?.openMode ?? AcEdOpenMode.Read
    this.renderButtons()
  }

  /** Disables the toolbar while a document is opening. */
  private handleDocumentToBeOpened = () => {
    this.isDisabled = true
    this.root.classList.add('is-disabled')
  }

  /**
   * @param options - Host, placement, items, i18n, and command callback.
   */
  constructor(private options: AcExToolbarOptions) {
    ensureUiStyles()
    this.items = options.items
    this.seedSelectedChildren(options.items)

    this.root = document.createElement('div')
    this.root.className = `ml-ex-ui-toolbar is-${this.getOrientationClass()} is-${options.placement}`
    this.root.setAttribute('role', 'toolbar')
    options.host.appendChild(this.root)

    AcApDocManager.instance.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
    AcApDocManager.instance.events.documentToBeOpened.addEventListener(
      this.handleDocumentToBeOpened
    )

    this.handleDocumentActivated()
  }

  /**
   * Replaces the toolbar item list and re-renders buttons.
   *
   * @param items - New toolbar items.
   */
  updateItems(items: AcExToolbarItem[]) {
    this.items = items
    this.seedSelectedChildren(items)
    this.renderButtons()
  }

  /** Refreshes open mode and re-renders (e.g. after locale or theme change). */
  refresh() {
    this.openMode =
      AcApDocManager.instance.curDocument?.openMode ?? AcEdOpenMode.Read
    this.renderButtons()
  }

  /**
   * Moves the toolbar to another host edge and updates orientation classes.
   *
   * @param placement - Target edge placement.
   */
  setPlacement(placement: AcExToolbarPlacement) {
    if (this.options.placement === placement) return
    this.options.placement = placement
    this.selectedChildByParent.set('toolbar-placement', `placement-${placement}`)
    this.root.className = `ml-ex-ui-toolbar is-${this.getOrientationClass()} is-${placement}`
    this.renderButtons()
  }

  /**
   * Sets the active submenu child for a parent button.
   *
   * @param parentId - Parent toolbar item id.
   * @param childId - Selected child item id.
   */
  setSelectedChild(parentId: string, childId: string) {
    this.selectedChildByParent.set(parentId, childId)
  }

  /** Current toolbar edge placement. */
  get placement() {
    return this.options.placement
  }

  /** Removes listeners, closes dropdowns, and detaches the toolbar DOM. */
  destroy() {
    this.openDropdown?.close()
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      this.handleDocumentActivated
    )
    AcApDocManager.instance.events.documentToBeOpened.removeEventListener(
      this.handleDocumentToBeOpened
    )
    this.root.remove()
  }

  /**
   * Returns the CSS orientation class suffix for the current placement.
   *
   * @returns `'vertical'` for left/right, `'horizontal'` for top/bottom.
   */
  private getOrientationClass() {
    return this.options.placement === 'left' ||
      this.options.placement === 'right'
      ? 'vertical'
      : 'horizontal'
  }

  /** Rebuilds all toolbar buttons from {@link items}. */
  private renderButtons() {
    this.openDropdown?.close()
    this.openDropdown = undefined
    this.root.replaceChildren()

    const visibleItems = filterVisibleToolbarItems(this.items, this.openMode)
    visibleItems.forEach(item => {
      if (isToolbarSeparatorItem(item)) {
        const separator = document.createElement('div')
        separator.className = 'ml-ex-ui-toolbar-separator'
        separator.setAttribute('role', 'separator')
        if (item.id) {
          separator.dataset.toolbarItemId = item.id
        }
        this.root.appendChild(separator)
        return
      }

      const effective = resolveParentToolbarDisplay(
        item,
        this.selectedChildByParent.get(item.id)
      )
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ml-ex-ui-toolbar-btn'
      button.title = effective.label
        ? this.options.i18n.t(effective.label)
        : effective.id
      button.setAttribute('aria-label', button.title)

      if (effective.children?.length) {
        button.classList.add('has-children')
      }

      if (effective.icon) {
        button.appendChild(createIconElement(effective.icon))
      } else if (effective.label) {
        const text = document.createElement('span')
        text.textContent = this.options.i18n.t(effective.label)
        text.style.fontSize = '11px'
        text.style.padding = '0 4px'
        button.appendChild(text)
      }

      const disabled =
        (itemRequiresDocument(effective) &&
          (this.isDisabled || !this.hasDocument)) ||
        isToolbarItemDisabled(effective)
      button.disabled = disabled

      button.addEventListener('click', event => {
        event.stopPropagation()
        if (button.disabled) return

        if (effective.children?.length) {
          const visibleChildren = filterVisibleToolbarItems(
            effective.children,
            this.openMode
          )
          if (visibleChildren.length === 0) return

          this.openDropdown?.close()
          const dropdown = new AcExDropdownMenu(
            this.options.i18n,
            visibleChildren,
            button,
            this.options.host
          )
          dropdown.setOnSelect(child => {
            if (item.childIcon === 'selected') {
              this.selectedChildByParent.set(item.id, child.id)
            }
            if (child.action) {
              child.action()
            } else if (child.command) {
              this.options.onCommand(child.command)
            }
            if (item.childIcon === 'selected' || item.toggle) {
              this.renderButtons()
            }
          })
          dropdown.setOnClose(() => {
            if (this.openDropdown === dropdown) {
              this.openDropdown = undefined
            }
          })
          this.openDropdown = dropdown
          return
        }

        if (effective.action) {
          effective.action()
        } else if (effective.command) {
          this.options.onCommand(effective.command)
        }
        if (item.toggle) {
          window.setTimeout(() => this.renderButtons(), 0)
        }
      })

      this.root.appendChild(button)
    })
  }

  /** Seeds submenu selection from {@link AcExToolbarItem.selectedChildId}. */
  private seedSelectedChildren(items: AcExToolbarItem[]) {
    for (const item of items) {
      if (isToolbarSeparatorItem(item)) continue
      if (item.childIcon === 'selected' && item.selectedChildId) {
        this.selectedChildByParent.set(item.id, item.selectedChildId)
      }
    }
  }
}
