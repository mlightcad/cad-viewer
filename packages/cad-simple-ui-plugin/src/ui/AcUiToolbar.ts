import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import {
  createIconElement,
  ICON_CHEVRON_DOWN,
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRON_UP,
  ICON_MORE
} from '../assets/icons'
import { acuiResolveToolbarChrome } from '../config/resolveToolbarChrome'
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
import type {
  AcUiSubToolbarOptions,
  AcUiToolbarItem,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement,
  AcUiToolbarSize
} from '../config/types'
import type { AcUiI18n } from '../i18n'
import { AcUiDropdownMenu } from './AcUiDropdownMenu'
import { AcUiSubToolbar } from './AcUiSubToolbar'
import { acuiEnsureUiStyles } from './styles'

/** Constructor / runtime mount options for {@link AcUiToolbar}. */
export interface AcUiToolbarMountOptions {
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
  /**
   * Minimum inset from host edges orthogonal to {@link edgeOffset} in px.
   * @default 0
   */
  sideOffset?: number
  /** When true, render button labels below icons (phone bottom bar). */
  showLabels?: boolean
  /** Sizing along the layout axis: `auto` or `stretch` to fill host width/height. */
  size?: AcUiToolbarSize
  /**
   * Overflow behavior when buttons exceed the host bounds.
   * @default 'menu'
   */
  overflow?: AcUiToolbarOverflow
  /** When false, hides the toolbar container border line. @default true */
  showBorder?: boolean
  /** When false, omits visual separators between toolbar groups. @default true */
  showSeparators?: boolean
  /** Sub-toolbar chrome and position overrides; unset chrome inherits from this toolbar. */
  subToolbar?: AcUiSubToolbarOptions
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
  /** Nested sub-toolbar opened from a strip item (e.g. locale under settings). */
  private openNestedSubToolbar?: AcUiSubToolbar
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
  /** Cross-axis inset from host edges orthogonal to placement. */
  private sideOffset: number
  /** Whether the toolbar container border is shown. */
  private showBorder: boolean
  /** Whether separator dividers are rendered between toolbar groups. */
  private showSeparators: boolean
  /** Keeps the toolbar inside the canvas when the host is resized. */
  private resizeObserver?: ResizeObserver
  private layoutFrame?: number
  /** Overflow ⋯ button (menu overflow mode). */
  private readonly overflowButton: HTMLButtonElement
  /** Dropdown listing items that did not fit in the toolbar. */
  private overflowDropdown?: AcUiDropdownMenu
  /** Items currently hidden behind the overflow menu. */
  private overflowItems: AcUiToolbarItem[] = []
  /** Whether menu overflow is showing the ⋯ button (used for vertical positioning). */
  private overflowMenuActive = false
  /** Toolbar item nodes rendered in the last {@link renderButtons} pass. */
  private renderedEntries: Array<{
    item: AcUiToolbarItem
    element: HTMLElement
    isSeparator: boolean
  }> = []

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
  constructor(private options: AcUiToolbarMountOptions) {
    acuiEnsureUiStyles()
    this.mountHost = options.host
    this.themeHost = options.themeHost ?? options.host
    this.edgeOffset = options.edgeOffset ?? 8
    this.sideOffset = options.sideOffset ?? 0
    this.showBorder = options.showBorder ?? true
    this.showSeparators = options.showSeparators ?? true
    this.items = options.items
    this.collapsed =
      Boolean(options.collapsible) && Boolean(options.defaultCollapsed)
    if (options.overflow === undefined) {
      options.overflow = 'menu'
    }
    this.seedSelectedChildren(options.items)
    this.ensureMountHostLayout()

    this.root = document.createElement('div')
    this.syncRootClasses()
    this.root.setAttribute('role', 'toolbar')

    this.overflowButton = document.createElement('button')
    this.overflowButton.type = 'button'
    this.overflowButton.className =
      'ml-ex-ui-toolbar-btn ml-ex-ui-toolbar-overflow-btn'
    this.overflowButton.dataset.toolbarItemId = 'toolbar-overflow'
    this.overflowButton.hidden = true
    this.overflowButton.appendChild(createIconElement(ICON_MORE))
    this.overflowButton.addEventListener('click', event => {
      event.stopPropagation()
      if (this.overflowButton.hidden) return
      this.toggleOverflowMenu()
    })

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

  /**
   * Applies layout-driven view options (placement, chrome flags, items).
   *
   * Used by {@link AcApSimpleUiPlugin} when switching phone / pad / desktop
   * layouts without recreating the toolbar instance.
   *
   * @param view - Partial toolbar view state to merge.
   */
  applyViewOptions(
    view: Partial<
      Pick<
        AcUiToolbarMountOptions,
        | 'placement'
        | 'edgeOffset'
        | 'sideOffset'
        | 'collapsible'
        | 'defaultCollapsed'
        | 'showLabels'
        | 'size'
        | 'overflow'
        | 'showBorder'
        | 'showSeparators'
        | 'subToolbar'
        | 'items'
      >
    >
  ) {
    if (view.placement !== undefined) {
      this.options.placement = view.placement
    }
    if (view.edgeOffset !== undefined) {
      this.edgeOffset = Math.max(0, view.edgeOffset)
    }
    if (view.sideOffset !== undefined) {
      this.sideOffset = Math.max(0, view.sideOffset)
    }
    if (view.collapsible !== undefined) {
      this.options.collapsible = view.collapsible
      if (!view.collapsible) {
        this.collapsed = false
      }
    }
    if (view.defaultCollapsed !== undefined) {
      this.collapsed =
        Boolean(this.options.collapsible) && Boolean(view.defaultCollapsed)
    }
    if (view.showLabels !== undefined) {
      this.options.showLabels = view.showLabels
    }
    if (view.size !== undefined) {
      this.options.size = view.size
    }
    if (view.overflow !== undefined) {
      this.options.overflow = view.overflow
    }
    if (view.showBorder !== undefined) {
      this.showBorder = view.showBorder
    }
    if (view.showSeparators !== undefined) {
      this.showSeparators = view.showSeparators
    }
    if (view.subToolbar !== undefined) {
      this.options.subToolbar = view.subToolbar
    }
    if (view.items !== undefined) {
      this.items = view.items
      this.seedSelectedChildren(view.items)
    }
    this.syncRootClasses()
    this.renderButtons()
    this.scheduleSyncPosition()
  }

  /** Refreshes open mode and re-renders (e.g. after locale or theme change). */
  refresh() {
    this.openMode =
      AcApDocManager.instance.curDocument?.openMode ?? AcEdOpenMode.Read
    this.renderButtons()
  }

  /** Updates button labels and tooltips after locale change. */
  refreshLocale() {
    this.syncOverflowButtonLabels()
    this.syncCollapseToggleButton()
    for (const { item, element, isSeparator } of this.renderedEntries) {
      if (isSeparator) continue
      const button = element as HTMLButtonElement
      const effective = acuiResolveParentToolbarDisplay(
        item,
        this.selectedChildByParent.get(item.id)
      )
      const label = effective.label
        ? this.options.i18n.t(effective.label)
        : effective.id
      button.title = label
      button.setAttribute('aria-label', label)
      const labelEl = button.querySelector('.ml-ex-ui-toolbar-btn-label')
      if (labelEl) {
        labelEl.textContent = label
      } else if (effective.label && !this.options.showLabels) {
        const text = button.querySelector('span')
        if (text) text.textContent = label
      }
    }
    this.openSubToolbar?.refreshLocale()
    this.openNestedSubToolbar?.refreshLocale()
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

  /** Current cross-axis inset from host edges in px. */
  getSideOffset() {
    return this.sideOffset
  }

  /**
   * Sets the cross-axis inset from host edges and reclamps toolbar position.
   *
   * @param offset - Distance in px (clamped to >= 0).
   */
  setSideOffset(offset: number) {
    this.sideOffset = Math.max(0, offset)
    this.scheduleSyncPosition()
  }

  /** Resolved chrome options for sub-toolbars. */
  resolveSubToolbarChrome() {
    return acuiResolveToolbarChrome(
      {
        edgeOffset: this.edgeOffset,
        sideOffset: this.sideOffset,
        showLabels: this.options.showLabels,
        size: this.options.size,
        overflow: this.options.overflow,
        showBorder: this.showBorder,
        showSeparators: this.showSeparators
      },
      this.options.subToolbar
    )
  }

  /**
   * Cross-axis host margins for wrap sizing and sub-toolbar clamping.
   *
   * Horizontal toolbars use {@link sideOffset} on the top/bottom edges; vertical
   * toolbars use it on the left/right edges. The dock edge keeps
   * {@link edgeOffset}.
   */
  getCrossAxisInset(): { near: number; far: number } {
    const horizontal = this.getOrientationClass() === 'horizontal'
    if (horizontal) {
      return this.options.placement === 'top'
        ? { near: this.edgeOffset, far: this.sideOffset }
        : { near: this.sideOffset, far: this.edgeOffset }
    }
    return this.options.placement === 'left'
      ? { near: this.sideOffset, far: this.edgeOffset }
      : { near: this.edgeOffset, far: this.sideOffset }
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

  /** Whether the toolbar root node is still attached to the document. */
  isRootConnected(): boolean {
    return this.root.isConnected
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

  /** Whether the toolbar stretches along its layout axis. */
  private isStretchSize(): boolean {
    return this.options.size === 'stretch'
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
    if (this.options.showLabels) classes.push('has-labels')
    if (this.options.size === 'stretch') classes.push('is-stretch')
    if (this.options.overflow === 'wrap') classes.push('is-overflow-wrap')
    if (this.options.overflow === 'menu') classes.push('is-overflow-menu')
    if (!this.showBorder) classes.push('no-border')
    this.root.className = classes.join(' ')
  }

  /** Appends icon and optional label content to a toolbar button. */
  private populateButtonContent(
    button: HTMLButtonElement,
    effective: AcUiToolbarItem
  ) {
    if (effective.icon) {
      button.appendChild(createIconElement(effective.icon))
    } else if (effective.label && !this.options.showLabels) {
      const text = document.createElement('span')
      text.textContent = this.options.i18n.t(effective.label)
      text.style.fontSize = '11px'
      text.style.padding = '0 4px'
      button.appendChild(text)
    }

    if (this.options.showLabels && effective.label) {
      const label = document.createElement('span')
      label.className = 'ml-ex-ui-toolbar-btn-label'
      label.textContent = this.options.i18n.t(effective.label)
      button.appendChild(label)
    }
  }

  /** Toggles collapsed state when {@link AcUiToolbarMountOptions.collapsible} is enabled. */
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

    if (this.showSeparators) {
      const separator = document.createElement('div')
      separator.className = 'ml-ex-ui-toolbar-separator'
      separator.setAttribute('role', 'separator')
      this.root.appendChild(separator)
    }

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
    this.renderedEntries = []
    this.overflowItems = []

    const visibleItems = acuiFilterVisibleToolbarItems(
      this.items,
      this.openMode
    )
    visibleItems.forEach(item => {
      if (acuiIsToolbarSeparatorItem(item)) {
        if (!this.showSeparators) return
        const separator = document.createElement('div')
        separator.className = 'ml-ex-ui-toolbar-separator'
        separator.setAttribute('role', 'separator')
        if (item.id) {
          separator.dataset.toolbarItemId = item.id
        }
        this.root.appendChild(separator)
        this.renderedEntries.push({
          item,
          element: separator,
          isSeparator: true
        })
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

      this.populateButtonContent(button, effective)

      const disabled =
        (acuiItemRequiresDocument(effective) &&
          (this.isDisabled || !this.hasDocument)) ||
        acuiIsToolbarItemDisabled(effective)
      button.disabled = disabled

      button.addEventListener('click', event => {
        event.stopPropagation()
        if (button.disabled) return
        this.activateToolbarItem(item, button)
      })

      this.root.appendChild(button)
      this.renderedEntries.push({ item, element: button, isSeparator: false })
    })

    if (this.options.overflow === 'menu') {
      this.syncOverflowButtonLabels()
      this.root.appendChild(this.overflowButton)
    }

    this.appendCollapseToggle()
    this.applyOverflowLayout()
    this.scheduleSyncPosition()
    if (restoreStickyId && !this.collapsed && this.visible) {
      this.openStickyChildrenByParentId(restoreStickyId)
    }
  }

  /**
   * Runs a toolbar item action or opens its children UI.
   *
   * @param item - Source toolbar item definition.
   * @param anchor - Button element used as the submenu anchor.
   */
  private activateToolbarItem(item: AcUiToolbarItem, anchor: HTMLButtonElement) {
    const effective = acuiResolveParentToolbarDisplay(
      item,
      this.selectedChildByParent.get(item.id)
    )

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

      this.openChildrenUi(item, anchor, visibleChildren)
      return
    }

    if (effective.anchorAction) {
      effective.anchorAction(anchor)
    } else if (effective.action) {
      effective.action()
    } else if (effective.command) {
      this.options.onCommand(effective.command)
    }
    if (item.toggle) {
      window.setTimeout(() => this.renderButtons(), 0)
    }
  }

  /** Syncs overflow button tooltip with the active locale. */
  private syncOverflowButtonLabels() {
    const label = this.options.i18n.t('toolbar.moreOverflow')
    this.overflowButton.title = label
    this.overflowButton.setAttribute('aria-label', label)
  }

  /** Applies overflow menu or wrap constraints after render or resize. */
  private applyOverflowLayout() {
    if (this.collapsed || !this.root.isConnected) {
      this.overflowButton.hidden = true
      this.overflowMenuActive = false
      return
    }

    if (this.options.overflow === 'wrap') {
      this.applyOverflowWrapLayout()
      return
    }

    if (this.options.overflow === 'menu') {
      this.applyOverflowMenuLayout()
    }
  }

  /** Constrains wrap layout to the mount host and allows multi-row/column flow. */
  private applyOverflowWrapLayout() {
    this.overflowButton.hidden = true
    this.renderedEntries.forEach(entry => {
      entry.element.hidden = false
    })

    const offset = this.edgeOffset
    const crossInset = this.getCrossAxisInset()
    const horizontal = this.getOrientationClass() === 'horizontal'
    if (horizontal) {
      const maxWidth = Math.max(0, this.mountHost.clientWidth - offset * 2)
      this.root.style.setProperty(
        '--ml-ex-ui-toolbar-max-width',
        `${maxWidth}px`
      )
      const maxHeight = Math.max(
        0,
        this.mountHost.clientHeight - crossInset.near - crossInset.far
      )
      this.root.style.setProperty(
        '--ml-ex-ui-toolbar-max-height',
        `${maxHeight}px`
      )
    } else {
      const maxWidth = Math.max(
        0,
        this.mountHost.clientWidth - crossInset.near - crossInset.far
      )
      this.root.style.setProperty(
        '--ml-ex-ui-toolbar-max-width',
        `${maxWidth}px`
      )
      const maxHeight = Math.max(0, this.mountHost.clientHeight - offset * 2)
      this.root.style.setProperty(
        '--ml-ex-ui-toolbar-max-height',
        `${maxHeight}px`
      )
    }
  }

  /** Returns the measured size of a toolbar child along the layout axis. */
  private getEntryAxisSize(entry: HTMLElement, horizontal: boolean): number {
    const measured = horizontal ? entry.offsetWidth : entry.offsetHeight
    if (measured > 0) return measured
    return entry.classList.contains('ml-ex-ui-toolbar-separator')
      ? horizontal
        ? 9
        : 9
      : 36
  }

  /** Hides overflowing items behind a ⋯ menu button. */
  private applyOverflowMenuLayout() {
    this.closeOverflowMenu()
    this.overflowItems = []
    this.overflowMenuActive = false
    this.overflowButton.hidden = true
    this.renderedEntries.forEach(entry => {
      entry.element.hidden = false
    })

    const horizontal = this.getOrientationClass() === 'horizontal'
    const hostLimit = this.getOverflowHostLimit(horizontal)

    if (hostLimit <= 0 || this.renderedEntries.length === 0) {
      this.root.style.removeProperty('--ml-ex-ui-toolbar-max-width')
      this.root.style.removeProperty('--ml-ex-ui-toolbar-max-height')
      return
    }

    if (this.getToolbarAxisSize(horizontal) <= hostLimit) {
      this.root.style.removeProperty('--ml-ex-ui-toolbar-max-width')
      this.root.style.removeProperty('--ml-ex-ui-toolbar-max-height')
      return
    }

    this.overflowButton.hidden = false

    let hideFrom = this.renderedEntries.length
    while (true) {
      for (let i = 0; i < this.renderedEntries.length; i++) {
        this.renderedEntries[i].element.hidden = i >= hideFrom
      }
      if (this.getToolbarAxisSize(horizontal) <= hostLimit || hideFrom === 0) {
        break
      }
      hideFrom -= 1
    }

    for (let i = hideFrom; i < this.renderedEntries.length; i++) {
      const entry = this.renderedEntries[i]
      if (!entry.isSeparator) {
        this.overflowItems.push(entry.item)
      }
    }

    this.overflowButton.hidden = this.overflowItems.length === 0
    this.overflowMenuActive = !this.overflowButton.hidden

    this.root.style.removeProperty('--ml-ex-ui-toolbar-max-width')
    this.root.style.removeProperty('--ml-ex-ui-toolbar-max-height')
  }

  /** Forces layout so axis measurements reflect the current DOM state. */
  private flushToolbarAxisMeasure() {
    void this.root.offsetHeight
    void this.root.offsetWidth
  }

  /**
   * Returns the toolbar root size along the layout axis (padding and chrome included).
   *
   * Uses live layout metrics; falls back to child summation in test environments.
   */
  private getToolbarAxisSize(horizontal: boolean): number {
    this.flushToolbarAxisMeasure()
    const measured = horizontal ? this.root.offsetWidth : this.root.offsetHeight
    if (measured > 0) return measured

    const gap = 4
    let size = 12
    let visibleCount = 0
    for (const child of Array.from(this.root.children)) {
      if (child instanceof HTMLElement && !child.hidden) {
        if (visibleCount > 0) size += gap
        size += this.getEntryAxisSize(child, horizontal)
        visibleCount += 1
      }
    }
    return size
  }

  /** Returns the host axis limit for toolbar content (inside edge offsets). */
  private getOverflowHostLimit(horizontal: boolean): number {
    const offset = this.edgeOffset
    const hostSize = horizontal
      ? this.mountHost.clientWidth
      : this.mountHost.clientHeight
    return Math.max(0, hostSize - offset * 2)
  }

  /** Opens or closes the overflow dropdown menu. */
  private toggleOverflowMenu() {
    if (this.overflowDropdown) {
      this.closeOverflowMenu()
      return
    }
    if (this.overflowItems.length === 0) return

    this.closeChildrenUi()

    const menuItems = this.overflowItems
      .map(item =>
        acuiResolveParentToolbarDisplay(
          item,
          this.selectedChildByParent.get(item.id)
        )
      )
      .filter(item => !acuiIsToolbarSeparatorItem(item))

    this.overflowDropdown = new AcUiDropdownMenu(
      this.options.i18n,
      menuItems,
      this.overflowButton,
      this.themeHost
    )
    this.overflowDropdown.setOnSelect(child => {
      this.activateToolbarItem(child, this.overflowButton)
      this.closeOverflowMenu()
    })
    this.overflowDropdown.setOnClose(() => {
      this.overflowDropdown = undefined
    })
  }

  /** Closes the overflow dropdown when open. */
  private closeOverflowMenu() {
    this.overflowDropdown?.close()
    this.overflowDropdown = undefined
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
      this.applyOverflowLayout()
      this.syncPosition()
      if (this.overflowMenuActive) {
        const horizontal = this.getOrientationClass() === 'horizontal'
        const hostLimit = this.getOverflowHostLimit(horizontal)
        if (this.getToolbarAxisSize(horizontal) > hostLimit) {
          this.applyOverflowMenuLayout()
          this.syncPosition()
        }
      }
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
    this.root.style.width = ''
    this.root.style.height = ''
    this.root.style.maxWidth = ''
    this.root.style.maxHeight = ''

    const horizontal = this.getOrientationClass() === 'horizontal'
    const toolbarWidth = this.getToolbarAxisSize(true)
    const toolbarHeight = this.getToolbarAxisSize(false)
    const placement = this.options.placement
    const stretch = this.isStretchSize()
    const hostLimit = horizontal
      ? hostWidth - offset * 2
      : hostHeight - offset * 2

    if (placement === 'top' || placement === 'bottom') {
      if (stretch) {
        this.root.style.left = '0'
        this.root.style.right = '0'
        this.root.style.width = `${hostWidth}px`
        this.root.style.maxWidth = `${hostWidth}px`
      } else {
        const maxLeft = Math.max(offset, hostWidth - toolbarWidth - offset)
        const idealLeft = (hostWidth - toolbarWidth) / 2
        const left = Math.min(maxLeft, Math.max(offset, idealLeft))
        this.root.style.left = `${left}px`
        this.root.style.maxWidth = `${Math.max(0, hostWidth - offset * 2)}px`
      }
      if (placement === 'top') {
        this.root.style.top = `${offset}px`
      } else {
        this.root.style.bottom = `${offset}px`
      }
      return
    }

    if (stretch) {
      const stretchHeight = Math.max(0, hostHeight - offset * 2)
      this.root.style.height = `${stretchHeight}px`
      this.root.style.top = `${offset}px`
    } else {
      const lowerTop = offset
      const upperTop = hostHeight - toolbarHeight - offset
      const idealTop = (hostHeight - toolbarHeight) / 2
      const pinOverflowMenu =
        this.options.overflow === 'menu' &&
        (this.overflowMenuActive || toolbarHeight > hostLimit)
      const top = pinOverflowMenu
        ? Math.max(lowerTop, upperTop)
        : upperTop >= lowerTop
          ? Math.min(upperTop, Math.max(lowerTop, idealTop))
          : upperTop
      this.root.style.top = `${top}px`
    }
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
    this.closeOverflowMenu()
    this.closeNestedSubToolbar()
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
        chrome: this.resolveSubToolbarChrome(),
        position: this.options.subToolbar?.position,
        getCrossAxisInset: () => this.getCrossAxisInset(),
        commandsDisabled: this.isDisabled || !this.hasDocument,
        onSelect: (child, childButton) =>
          this.handleSubToolbarSelect(item, child, childButton, sticky),
        onClose: () => {
          if (this.openSubToolbar === strip) {
            this.closeNestedSubToolbar()
            this.openSubToolbar = undefined
            this.clearParentOpenState()
            this.openParentId = undefined
            this.stickyParentId = undefined
          }
        },
        shouldKeepOpenForTarget: target =>
          this.openNestedSubToolbar?.containsTarget(target) ?? false
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

  /** Closes the nested sub-toolbar opened from a parent strip item. */
  private closeNestedSubToolbar() {
    this.openNestedSubToolbar?.close()
    this.openNestedSubToolbar = undefined
  }

  /**
   * Handles a sub-toolbar item click, opening nested strips when needed.
   *
   * @param stripParent - Root parent item that owns the first-level strip.
   * @param child - Sub-toolbar item that was activated.
   * @param button - Anchor button for nested UI positioning.
   * @param stripSticky - Whether the first-level strip is sticky.
   */
  private handleSubToolbarSelect(
    stripParent: AcUiToolbarItem,
    child: AcUiToolbarItem,
    button: HTMLButtonElement,
    stripSticky: boolean
  ) {
    if (acuiIsToolbarSeparatorItem(child)) return

    const effective = acuiResolveEffectiveToolbarItem(child)
    if (
      effective.children?.length ||
      acuiIsDynamicToolbarChildren(effective)
    ) {
      const visibleChildren = acuiFilterVisibleToolbarItems(
        effective.children ?? [],
        this.openMode
      ).map(acuiResolveEffectiveToolbarItem)
      if (visibleChildren.length === 0) return
      this.openNestedSubToolbarUi(
        effective,
        button,
        visibleChildren,
        stripParent,
        stripSticky
      )
      return
    }

    this.activateChild(stripParent, child, stripSticky)
    if (!stripSticky) {
      this.closeChildrenUi()
    }
  }

  /**
   * Opens a nested icon strip or dropdown for a sub-toolbar parent
   * (e.g. locale under settings on the phone toolbar).
   *
   * @param item - Parent item with nested children.
   * @param button - Sub-toolbar button used as the nested anchor.
   * @param visibleChildren - Filtered child items to show.
   * @param stripParent - First-level strip parent (for refresh after nested select).
   * @param stripSticky - Whether the first-level strip is sticky.
   */
  private openNestedSubToolbarUi(
    item: AcUiToolbarItem,
    button: HTMLButtonElement,
    visibleChildren: AcUiToolbarItem[],
    stripParent: AcUiToolbarItem,
    stripSticky: boolean
  ) {
    this.closeNestedSubToolbar()
    const childrenUi = acuiResolveToolbarChildrenUi(item)

    if (!acuiIsToolbarChildrenStrip(childrenUi)) {
      const dropdown = new AcUiDropdownMenu(
        this.options.i18n,
        visibleChildren,
        button,
        this.themeHost
      )
      dropdown.setOnSelect(child => {
        this.activateChild(item, child, false)
        dropdown.close()
        if (!stripSticky) {
          this.closeChildrenUi()
        } else {
          this.openSubToolbar?.refresh(
            acuiFilterVisibleToolbarItems(
              stripParent.children ?? [],
              this.openMode
            ).map(acuiResolveEffectiveToolbarItem),
            this.isDisabled || !this.hasDocument
          )
        }
      })
      dropdown.setOnClose(() => undefined)
      return
    }

    const nestedSticky = childrenUi === 'sticky-toolbar'
    const nested = new AcUiSubToolbar({
      i18n: this.options.i18n,
      items: visibleChildren,
      anchor: button,
      toolbarRoot: this.root,
      host: this.mountHost,
      placement: this.options.placement,
      sticky: nestedSticky,
      chrome: this.resolveSubToolbarChrome(),
      position: this.options.subToolbar?.position,
      getCrossAxisInset: () => this.getCrossAxisInset(),
      commandsDisabled: this.isDisabled || !this.hasDocument,
      onSelect: (child, nestedButton) =>
        this.handleSubToolbarSelect(item, child, nestedButton, nestedSticky),
      onClose: () => {
        if (this.openNestedSubToolbar === nested) {
          this.openNestedSubToolbar = undefined
        }
      }
    })
    this.openNestedSubToolbar = nested
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
    const effective = acuiResolveEffectiveToolbarItem(child)
    if (parent.childIcon === 'selected') {
      this.selectedChildByParent.set(parent.id, effective.id)
    }
    if (effective.action) {
      effective.action()
    } else if (effective.command) {
      this.options.onCommand(effective.command)
    }

    const isLocalePick =
      !acuiIsToolbarSeparatorItem(child) &&
      effective.id.startsWith('locale-')
    if (isLocalePick) {
      this.refreshLocale()
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
