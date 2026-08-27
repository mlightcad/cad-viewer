import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import {
  createIconElement,
  ICON_CHEVRON_DOWN,
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRON_UP
} from '../assets/icons'
import {
  acuiFilterVisibleToolbarItems,
  acuiIsToolbarItemDisabled,
  acuiItemRequiresDocument,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay
} from '../config/resolveToolbarItems'
import {
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarChildrenStrip,
  acuiIsToolbarSeparatorItem,
  acuiResolveToolbarChildrenUi
} from '../config/toolbarItemUtils'
import type { AcUiToolbarItem, AcUiToolbarPlacement } from '../config/types'
import type { AcUiI18n } from '../i18n'
import { AcUiDropdownMenu } from './AcUiDropdownMenu'
import { AcUiSubToolbar } from './AcUiSubToolbar'
import { acuiEnsureUiStyles } from './styles'

/** Constructor options for {@link AcUiToolbar}. */
export interface AcUiToolbarOptions {
  /** Viewer canvas element that receives the toolbar root node. */
  host: HTMLElement
  /** Theme host for dropdown menus; defaults to {@link host}. */
  themeHost?: HTMLElement
  /** Edge placement of the toolbar. */
  placement: AcUiToolbarPlacement
  /** Toolbar item definitions to render. */
  items: AcUiToolbarItem[]
  /** i18n helper for button labels and tooltips. */
  i18n: AcUiI18n
  /** Invoked when a leaf item with a `command` is activated. */
  onCommand: (command: string) => void
  /** When true, append a collapse/expand toggle at the end of the toolbar. */
  collapsible?: boolean
  /** Initial collapsed state when {@link collapsible} is true. */
  defaultCollapsed?: boolean
  /** Invoked when the toolbar is collapsed (e.g. close the dock panel). */
  onCollapse?: () => void
  /** Distance from the canvas edge in px. @default 8 */
  edgeOffset?: number
}

/**
 * Plain-DOM floating toolbar with sub-toolbars, dropdown menus, and toggles.
 *
 * Disables command buttons while a document is loading and filters items by
 * document open mode.
 */
export class AcUiToolbar {
  /** Canvas element receiving the toolbar root node. */
  private mountHost: HTMLElement
  /** Host element used for themed dropdown menus. */
  private themeHost: HTMLElement
  /** Root toolbar container appended to the mount host. */
  private root: HTMLDivElement
  /** Currently open popover submenu, if any. */
  private openDropdown?: AcUiDropdownMenu
  /** Currently open icon sub-toolbar, if any. */
  private openSubToolbar?: AcUiSubToolbar
  /** Parent item id of the open children UI. */
  private openParentId?: string
  /** Sticky sub-toolbar parent id restored after a full re-render. */
  private stickyParentId?: string
  /** Parent button currently marked as expanded. */
  private openParentButton?: HTMLElement
  /** Whether the toolbar is globally disabled during document open. */
  private isDisabled = false
  /** Current document open mode used for item visibility. */
  private openMode = AcEdOpenMode.Read
  /** Whether an active document is loaded. */
  private hasDocument = false
  /** Item list last passed to {@link updateItems} or the constructor. */
  private items: AcUiToolbarItem[]
  /** Runtime submenu selection for parents with {@link AcUiToolbarItem.childIcon} `'selected'`. */
  private selectedChildByParent = new Map<string, string>()
  /** Whether the toolbar is collapsed to show only the toggle button. */
  private collapsed: boolean
  /** Whether the toolbar root is shown. */
  private visible = true
  /** Inset from the canvas edge in px. */
  private edgeOffset: number
  /** Keeps the toolbar inside the canvas when the host is resized. */
  private resizeObserver?: ResizeObserver
  private layoutFrame?: number

  /** Re-renders buttons when a document becomes active. */
  private handleDocumentActivated = () => {
    this.hasDocument = Boolean(AcApDocManager.instance.curDocument)
    this.isDisabled = false
    this.syncRootClasses()
    this.openMode =
      AcApDocManager.instance.curDocument?.openMode ?? AcEdOpenMode.Read
    this.renderButtons()
  }

  /** Disables the toolbar while a document is opening. */
  private handleDocumentToBeOpened = () => {
    this.isDisabled = true
    this.syncRootClasses()
    this.closeChildrenUi()
  }

  /**
   * @param options - Host, placement, items, i18n, and command callback.
   */
  constructor(private options: AcUiToolbarOptions) {
    acuiEnsureUiStyles()
    this.mountHost = options.host
    this.themeHost = options.themeHost ?? options.host
    this.edgeOffset = options.edgeOffset ?? 8
    this.items = options.items
    this.collapsed =
      Boolean(options.collapsible) && Boolean(options.defaultCollapsed)
    this.seedSelectedChildren(options.items)
    this.ensureMountHostLayout()

    this.root = document.createElement('div')
    this.syncRootClasses()
    this.root.setAttribute('role', 'toolbar')
    this.mountHost.appendChild(this.root)
    this.setupResizeObserver()

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
  updateItems(items: AcUiToolbarItem[]) {
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
  setPlacement(placement: AcUiToolbarPlacement) {
    if (this.options.placement === placement) return
    this.options.placement = placement
    this.selectedChildByParent.set(
      'toolbar-placement',
      `placement-${placement}`
    )
    this.syncRootClasses()
    this.renderButtons()
  }

  /** Current inset from the canvas edge in px. */
  getEdgeOffset() {
    return this.edgeOffset
  }

  /**
   * Sets the inset from the canvas edge and reclamps toolbar position.
   *
   * @param offset - Distance in px (clamped to >= 0).
   */
  setEdgeOffset(offset: number) {
    this.edgeOffset = Math.max(0, offset)
    this.scheduleSyncPosition()
  }

  /**
   * Moves the toolbar to another canvas mount element.
   *
   * @param newHost - New canvas container.
   */
  reparentTo(newHost: HTMLElement) {
    if (this.mountHost === newHost) return

    this.resizeObserver?.disconnect()
    this.root.remove()
    this.mountHost = newHost
    this.ensureMountHostLayout()
    this.mountHost.appendChild(this.root)
    this.setupResizeObserver()
    this.scheduleSyncPosition()
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

  /** Whether the toolbar is collapsed to the toggle button only. */
  get isCollapsed() {
    return this.collapsed
  }

  /** Whether the toolbar root is visible. */
  get isVisible() {
    return this.visible
  }

  /**
   * Shows or hides the entire toolbar.
   *
   * @param visible - Target visibility.
   */
  setVisible(visible: boolean) {
    if (this.visible === visible) return
    this.visible = visible
    this.root.hidden = !visible
    if (!visible) {
      this.closeChildrenUi()
      this.options.onCollapse?.()
    }
  }

  /**
   * Returns the layer toolbar button, expanding a collapsed toolbar first.
   */
  getLayerButtonAnchor(): HTMLElement | undefined {
    if (this.options.collapsible && this.collapsed) {
      this.setCollapsed(false)
    }
    return (
      this.root.querySelector<HTMLElement>('[data-toolbar-item-id="layer"]') ??
      undefined
    )
  }

  /**
   * Sets collapsed state without toggling.
   *
   * @param collapsed - Target collapsed state.
   */
  setCollapsed(collapsed: boolean) {
    if (!this.options.collapsible || this.collapsed === collapsed) return
    this.collapsed = collapsed
    if (collapsed) {
      this.closeChildrenUi()
      this.options.onCollapse?.()
    }
    this.syncRootClasses()
    this.syncCollapseToggleButton()
    this.scheduleSyncPosition()
  }

  /** Removes listeners, closes dropdowns, and detaches the toolbar DOM. */
  destroy() {
    if (this.layoutFrame !== undefined) {
      cancelAnimationFrame(this.layoutFrame)
      this.layoutFrame = undefined
    }
    this.resizeObserver?.disconnect()
    this.resizeObserver = undefined
    this.closeChildrenUi()
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

  /** Applies placement, collapsed, and disabled classes on the root element. */
  private syncRootClasses() {
    const classes = [
      'ml-ex-ui-toolbar',
      `is-${this.getOrientationClass()}`,
      `is-${this.options.placement}`
    ]
    if (this.collapsed) classes.push('is-collapsed')
    if (this.isDisabled) classes.push('is-disabled')
    this.root.className = classes.join(' ')
  }

  /** Toggles collapsed state when {@link AcUiToolbarOptions.collapsible} is enabled. */
  private toggleCollapsed() {
    this.setCollapsed(!this.collapsed)
  }

  /**
   * Chevron for the collapse toggle: vertical placements use up/down;
   * horizontal placements (top/bottom) use left/right.
   */
  private getCollapseToggleIcon() {
    const horizontal =
      this.options.placement === 'top' || this.options.placement === 'bottom'
    if (horizontal) {
      return this.collapsed ? ICON_CHEVRON_RIGHT : ICON_CHEVRON_LEFT
    }
    return this.collapsed ? ICON_CHEVRON_DOWN : ICON_CHEVRON_UP
  }

  /** Updates collapse toggle icon and labels after locale or state changes. */
  private syncCollapseToggleButton(button?: HTMLButtonElement) {
    const target =
      button ??
      this.root.querySelector<HTMLButtonElement>(
        '[data-toolbar-item-id="toolbar-collapse"]'
      )
    if (!target) return

    const labelKey = this.collapsed ? 'toolbar.expand' : 'toolbar.collapse'
    target.replaceChildren(createIconElement(this.getCollapseToggleIcon()))
    target.title = this.options.i18n.t(labelKey)
    target.setAttribute('aria-label', target.title)
    target.setAttribute('aria-expanded', String(!this.collapsed))
  }

  /** Appends separator and collapse toggle when collapsible mode is enabled. */
  private appendCollapseToggle() {
    if (!this.options.collapsible) return

    const separator = document.createElement('div')
    separator.className = 'ml-ex-ui-toolbar-separator'
    separator.setAttribute('role', 'separator')
    this.root.appendChild(separator)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'ml-ex-ui-toolbar-btn ml-ex-ui-toolbar-collapse-btn'
    button.dataset.toolbarItemId = 'toolbar-collapse'
    this.syncCollapseToggleButton(button)
    button.addEventListener('click', event => {
      event.stopPropagation()
      this.toggleCollapsed()
    })
    this.root.appendChild(button)
  }

  /** Rebuilds all toolbar buttons from {@link items}. */
  private renderButtons() {
    const restoreStickyId = this.stickyParentId
    this.closeChildrenUi()
    this.root.replaceChildren()

    const visibleItems = acuiFilterVisibleToolbarItems(
      this.items,
      this.openMode
    )
    visibleItems.forEach(item => {
      if (acuiIsToolbarSeparatorItem(item)) {
        const separator = document.createElement('div')
        separator.className = 'ml-ex-ui-toolbar-separator'
        separator.setAttribute('role', 'separator')
        if (item.id) {
          separator.dataset.toolbarItemId = item.id
        }
        this.root.appendChild(separator)
        return
      }

      const effective = acuiResolveParentToolbarDisplay(
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
      button.dataset.toolbarItemId = effective.id

      if (effective.children?.length || acuiIsDynamicToolbarChildren(item)) {
        button.classList.add('has-children')
        button.setAttribute('aria-haspopup', 'true')
        button.setAttribute('aria-expanded', 'false')
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
        (acuiItemRequiresDocument(effective) &&
          (this.isDisabled || !this.hasDocument)) ||
        acuiIsToolbarItemDisabled(effective)
      button.disabled = disabled

      button.addEventListener('click', event => {
        event.stopPropagation()
        if (button.disabled) return

        if (effective.children?.length || acuiIsDynamicToolbarChildren(item)) {
          const visibleChildren = acuiFilterVisibleToolbarItems(
            effective.children ?? [],
            this.openMode
          ).map(acuiResolveEffectiveToolbarItem)
          if (visibleChildren.length === 0) return

          if (this.openParentId === item.id) {
            this.closeChildrenUi()
            return
          }

          this.openChildrenUi(item, button, visibleChildren)
          return
        }

        if (effective.anchorAction) {
          effective.anchorAction(button)
        } else if (effective.action) {
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

    this.appendCollapseToggle()
    this.scheduleSyncPosition()
    if (restoreStickyId && !this.collapsed && this.visible) {
      this.openStickyChildrenByParentId(restoreStickyId)
    }
  }

  private ensureMountHostLayout() {
    if (getComputedStyle(this.mountHost).position === 'static') {
      this.mountHost.style.position = 'relative'
    }
    this.mountHost.classList.add('ml-ex-ui-toolbar-host')
  }

  private setupResizeObserver() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleSyncPosition()
    })
    this.resizeObserver.observe(this.mountHost)
  }

  private scheduleSyncPosition() {
    if (this.layoutFrame !== undefined) return
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = undefined
      this.syncPosition()
      this.openSubToolbar?.syncPosition()
    })
  }

  /** Positions the toolbar inside the canvas, clamped to the current host bounds. */
  private syncPosition() {
    if (!this.root.isConnected || this.root.hidden) return

    const offset = this.edgeOffset
    const hostWidth = this.mountHost.clientWidth
    const hostHeight = this.mountHost.clientHeight
    if (hostWidth <= 0 || hostHeight <= 0) return

    this.root.style.top = ''
    this.root.style.bottom = ''
    this.root.style.left = ''
    this.root.style.right = ''
    this.root.style.transform = ''
    this.root.style.maxWidth = ''
    this.root.style.maxHeight = ''

    const toolbarWidth = this.root.offsetWidth
    const toolbarHeight = this.root.offsetHeight
    const placement = this.options.placement

    if (placement === 'top' || placement === 'bottom') {
      const maxLeft = Math.max(offset, hostWidth - toolbarWidth - offset)
      const idealLeft = (hostWidth - toolbarWidth) / 2
      const left = Math.min(maxLeft, Math.max(offset, idealLeft))
      this.root.style.left = `${left}px`
      this.root.style.maxWidth = `${Math.max(0, hostWidth - offset * 2)}px`
      if (placement === 'top') {
        this.root.style.top = `${offset}px`
      } else {
        this.root.style.bottom = `${offset}px`
      }
      return
    }

    const maxTop = Math.max(offset, hostHeight - toolbarHeight - offset)
    const idealTop = (hostHeight - toolbarHeight) / 2
    const top = Math.min(maxTop, Math.max(offset, idealTop))
    this.root.style.top = `${top}px`
    this.root.style.maxHeight = `${Math.max(0, hostHeight - offset * 2)}px`
    if (placement === 'left') {
      this.root.style.left = `${offset}px`
    } else {
      this.root.style.right = `${offset}px`
    }
  }

  /** Seeds submenu selection from {@link AcUiToolbarItem.selectedChildId}. */
  private seedSelectedChildren(items: AcUiToolbarItem[]) {
    for (const item of items) {
      if (acuiIsToolbarSeparatorItem(item)) continue
      if (item.childIcon === 'selected' && item.selectedChildId) {
        this.selectedChildByParent.set(item.id, item.selectedChildId)
      }
    }
  }

  /** Closes any open dropdown or sub-toolbar and clears parent expanded state. */
  private closeChildrenUi() {
    this.openDropdown?.close()
    this.openDropdown = undefined
    this.openSubToolbar?.close()
    this.openSubToolbar = undefined
    this.clearParentOpenState()
    this.openParentId = undefined
    this.stickyParentId = undefined
  }

  /** Removes `is-open` / `aria-expanded` from the last expanded parent button. */
  private clearParentOpenState() {
    if (!this.openParentButton) return
    this.openParentButton.classList.remove('is-open')
    this.openParentButton.setAttribute('aria-expanded', 'false')
    this.openParentButton = undefined
  }

  /**
   * Marks a parent button as expanded while its children UI is open.
   *
   * @param button - Parent toolbar button.
   */
  private markParentOpen(button: HTMLElement) {
    this.clearParentOpenState()
    button.classList.add('is-open')
    button.setAttribute('aria-expanded', 'true')
    this.openParentButton = button
  }

  /**
   * Opens a dropdown or sub-toolbar for a parent item.
   *
   * @param item - Parent toolbar item.
   * @param button - Parent button used as the anchor.
   * @param visibleChildren - Filtered, effective child items.
   */
  private openChildrenUi(
    item: AcUiToolbarItem,
    button: HTMLButtonElement,
    visibleChildren: AcUiToolbarItem[]
  ) {
    this.closeChildrenUi()
    const childrenUi = acuiResolveToolbarChildrenUi(item)
    this.openParentId = item.id
    this.markParentOpen(button)

    if (acuiIsToolbarChildrenStrip(childrenUi)) {
      const sticky = childrenUi === 'sticky-toolbar'
      this.stickyParentId = sticky ? item.id : undefined
      const strip = new AcUiSubToolbar({
        i18n: this.options.i18n,
        items: visibleChildren,
        anchor: button,
        toolbarRoot: this.root,
        host: this.mountHost,
        placement: this.options.placement,
        sticky,
        commandsDisabled: this.isDisabled || !this.hasDocument,
        onSelect: child => this.activateChild(item, child, sticky),
        onClose: () => {
          if (this.openSubToolbar === strip) {
            this.openSubToolbar = undefined
            this.clearParentOpenState()
            this.openParentId = undefined
            this.stickyParentId = undefined
          }
        }
      })
      this.openSubToolbar = strip
      return
    }

    const dropdown = new AcUiDropdownMenu(
      this.options.i18n,
      visibleChildren,
      button,
      this.themeHost
    )
    dropdown.setOnSelect(child => {
      this.activateChild(item, child, false)
    })
    dropdown.setOnClose(() => {
      if (this.openDropdown === dropdown) {
        this.openDropdown = undefined
        this.clearParentOpenState()
        this.openParentId = undefined
      }
    })
    this.openDropdown = dropdown
  }

  /**
   * Re-opens a sticky sub-toolbar after the main toolbar is rebuilt.
   *
   * @param parentId - Parent item id that was sticky-open.
   */
  private openStickyChildrenByParentId(parentId: string) {
    const item = this.items.find(candidate => {
      if (acuiIsToolbarSeparatorItem(candidate)) return false
      return candidate.id === parentId
    })
    if (!item?.children?.length) return
    if (acuiResolveToolbarChildrenUi(item) !== 'sticky-toolbar') return

    const button = this.root.querySelector<HTMLButtonElement>(
      `[data-toolbar-item-id="${parentId}"]`
    )
    if (!button) return

    const visibleChildren = acuiFilterVisibleToolbarItems(
      item.children,
      this.openMode
    ).map(acuiResolveEffectiveToolbarItem)
    if (visibleChildren.length === 0) return

    this.openChildrenUi(item, button, visibleChildren)
  }

  /**
   * Runs a child item's action/command and refreshes parent/child UI as needed.
   *
   * @param parent - Parent toolbar item.
   * @param child - Selected child item.
   * @param sticky - Whether the child UI should stay open.
   */
  private activateChild(
    parent: AcUiToolbarItem,
    child: AcUiToolbarItem,
    sticky: boolean
  ) {
    if (acuiIsToolbarSeparatorItem(child)) return
    if (parent.childIcon === 'selected') {
      this.selectedChildByParent.set(parent.id, child.id)
    }
    if (child.action) {
      child.action()
    } else if (child.command) {
      this.options.onCommand(child.command)
    }

    if (child.toggle && sticky && this.openSubToolbar) {
      window.setTimeout(() => {
        if (!this.openSubToolbar) return
        const visibleChildren = acuiFilterVisibleToolbarItems(
          parent.children ?? [],
          this.openMode
        ).map(acuiResolveEffectiveToolbarItem)
        this.openSubToolbar.refresh(
          visibleChildren,
          this.isDisabled || !this.hasDocument
        )
      }, 0)
      return
    }

    if (child.toggle) {
      window.setTimeout(() => this.renderButtons(), 0)
    } else if (parent.childIcon === 'selected' || parent.toggle) {
      this.renderButtons()
    }
  }
}
