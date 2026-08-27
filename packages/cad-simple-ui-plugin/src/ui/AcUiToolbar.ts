import {
  createIconElement,
  ICON_CHEVRON_DOWN,
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRON_UP
} from '@mlightcad/cad-simple-viewer/icons'

import {
  acuiFilterVisibleToolbarItems,
  acuiIsToolbarItemDisabled,
  acuiItemRequiresDocument,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay
} from '../config/toolbarItemDisplay'
import {
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarChildrenStrip,
  acuiIsToolbarSeparatorItem,
  acuiResolveToolbarChildrenUi
} from '../config/toolbarItemUtils'
import type {
  AcUiToolbarItem,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement
} from '../config/types'
import { AcUiDropdownMenu } from './AcUiDropdownMenu'
import { AcUiSubToolbar } from './AcUiSubToolbar'
import { acuiEnsureUiStyles } from './styles'
import { ML_EX_UI_MOBILE_MEDIA_QUERY } from './uiLayout'

const TOOLBAR_GAP_PX = 4
const TOOLBAR_PADDING_PX = 6
const OVERFLOW_PARENT_ID = '__overflow__'
/** Aligns with `AcEdOpenMode` without importing cad-simple-viewer. */
const OPEN_MODE_READ = 0
const OPEN_MODE_WRITE = 8
const ICON_MORE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><circle cx="4.5" cy="10" r="1.6" fill="currentColor"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/><circle cx="15.5" cy="10" r="1.6" fill="currentColor"/></svg>'

/**
 * Minimal i18n contract used by {@link AcUiToolbar} and related chrome.
 * Hosts may supply {@link AcUiI18n} or any object with a compatible `t`.
 */
export interface AcUiToolbarI18n {
  t(key: string, params?: Record<string, string>): string
}

/** Document visibility/open-mode snapshot when {@link AcUiToolbarOptions.docBinding} is false. */
export interface AcUiToolbarDocState {
  /** Whether command buttons that require a document stay enabled. */
  hasDocument: boolean
  /** Open mode used for {@link AcUiToolbarItem.minOpenMode} filtering. */
  openMode: number
}

/**
 * Document-manager facade for hosts that enable {@link AcUiToolbarOptions.docBinding}.
 * Keeps `@mlightcad/cad-simple-viewer` out of the toolbar module graph for offline bundles.
 */
export interface AcUiToolbarDocBridge {
  hasDocument(): boolean
  getOpenMode(): number
  subscribeActivated(listener: () => void): void
  unsubscribeActivated(listener: () => void): void
  subscribeToBeOpened(listener: () => void): void
  unsubscribeToBeOpened(listener: () => void): void
}

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
  i18n: AcUiToolbarI18n
  /** Invoked when a leaf item with a `command` is activated. */
  onCommand: (command: string) => void
  /** When true, append a collapse/expand toggle at the end of the toolbar. */
  collapsible?: boolean
  /** Initial collapsed state when {@link collapsible} is true. */
  defaultCollapsed?: boolean
  /** Invoked when the toolbar is collapsed (e.g. close the dock panel). */
  onCollapse?: () => void
  /** Distance from the docked canvas edge in px. @default 8 */
  edgeOffset?: number
  /**
   * How overflowing items are shown when the host is too small.
   * @default 'menu'
   */
  overflow?: AcUiToolbarOverflow
  /**
   * Layout mode for the toolbar root.
   * - `'absolute'` (default): floats inside {@link host} on the docked edge.
   * - `'static'`: participates in normal document flow (e.g. HTML export sidebar).
   */
  positioning?: 'absolute' | 'static'
  /**
   * When true (default), subscribe via {@link docBridge}.
   * Set to false for offline hosts (e.g. HTML export runtime); then use {@link documentState}.
   */
  docBinding?: boolean
  /**
   * Required when {@link docBinding} is true. Supplied by SimpleUiPlugin from
   * `AcApDocManager` so this module does not import cad-simple-viewer.
   */
  docBridge?: AcUiToolbarDocBridge
  /**
   * Document state when {@link docBinding} is false.
   * @default `{ hasDocument: true, openMode: 8 }` (Write)
   */
  documentState?: AcUiToolbarDocState
  /**
   * Called after buttons are rebuilt ({@link AcUiToolbar.updateItems},
   * {@link AcUiToolbar.refresh}, or an internal re-render). Hosts can re-apply
   * transient `active` classes that live outside item config.
   */
  onRender?: () => void
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
  /** Nested sub-toolbar opened from a child that itself has children (e.g. settings → locale). */
  private nestedSubToolbar?: AcUiSubToolbar
  /** Parent item id of the open children UI. */
  private openParentId?: string
  /** Nested parent item id while a nested strip is open. */
  private nestedParentId?: string
  /** Sticky sub-toolbar parent id restored after a full re-render. */
  private stickyParentId?: string
  /** Parent button currently marked as expanded. */
  private openParentButton?: HTMLElement
  /** Whether the toolbar is globally disabled during document open. */
  private isDisabled = false
  /** Current document open mode used for item visibility. */
  private openMode = OPEN_MODE_READ
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
  /** Whether document manager events are wired. */
  private readonly docBinding: boolean
  /** Document bridge when {@link docBinding} is true. */
  private readonly docBridge?: AcUiToolbarDocBridge
  /** Absolute float vs in-flow layout. */
  private readonly positioning: 'absolute' | 'static'
  /** Inset from the docked canvas edge in px. */
  private edgeOffset: number
  /** How overflowing items are shown when the host is too small. */
  private overflow: AcUiToolbarOverflow
  /** Flex strip that holds toolbar buttons and separators. */
  private itemsEl: HTMLDivElement
  /** "More" button that opens overflowing items as a popup. */
  private overflowButton: HTMLButtonElement
  /** Items currently hidden behind {@link overflowButton}. */
  private overflowedItems: AcUiToolbarItem[] = []
  /** When set, the toolbar is flush to the host on that axis (overflow ⋯ visible). */
  private overflowFlush?: 'x' | 'y'
  /** Rendered items keyed by id for overflow activation. */
  private itemById = new Map<string, AcUiToolbarItem>()
  /** Keeps the toolbar inside the canvas when the host is resized. */
  private resizeObserver?: ResizeObserver
  /** Re-layouts overflow when the viewport crosses the mobile breakpoint. */
  private mobileMql?: MediaQueryList
  private layoutFrame?: number
  /** Repositions overflow/sub-toolbars after the mobile breakpoint changes. */
  private handleMobileLayoutChange = () => {
    this.scheduleSyncPosition()
  }

  /** Re-renders buttons when a document becomes active. */
  private handleDocumentActivated = () => {
    if (!this.docBinding || !this.docBridge) return
    this.hasDocument = this.docBridge.hasDocument()
    this.isDisabled = false
    this.syncRootClasses()
    this.openMode = this.docBridge.getOpenMode()
    this.renderButtons()
  }

  /** Disables the toolbar while a document is opening. */
  private handleDocumentToBeOpened = () => {
    if (!this.docBinding) return
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
    this.overflow = options.overflow ?? 'menu'
    this.docBinding = options.docBinding !== false
    this.docBridge = options.docBridge
    this.positioning = options.positioning ?? 'absolute'
    this.items = options.items
    this.collapsed =
      Boolean(options.collapsible) && Boolean(options.defaultCollapsed)
    this.seedSelectedChildren(options.items)
    this.ensureMountHostLayout()

    if (!this.docBinding) {
      this.hasDocument = options.documentState?.hasDocument ?? true
      this.openMode = options.documentState?.openMode ?? OPEN_MODE_WRITE
      this.isDisabled = false
    }

    this.root = document.createElement('div')
    this.syncRootClasses()
    this.root.setAttribute('role', 'toolbar')

    this.itemsEl = document.createElement('div')
    this.itemsEl.className = 'ml-ex-ui-toolbar-items'

    this.overflowButton = document.createElement('button')
    this.overflowButton.type = 'button'
    this.overflowButton.className =
      'ml-ex-ui-toolbar-btn ml-ex-ui-toolbar-overflow-btn'
    this.overflowButton.dataset.toolbarItemId = 'toolbar-overflow'
    this.overflowButton.hidden = true
    this.overflowButton.setAttribute('aria-haspopup', 'menu')
    this.overflowButton.setAttribute('aria-expanded', 'false')
    this.overflowButton.appendChild(createIconElement(ICON_MORE))
    this.syncOverflowButtonLabel()
    this.overflowButton.addEventListener('click', event => {
      event.stopPropagation()
      this.toggleOverflowMenu()
    })

    this.root.append(this.itemsEl, this.overflowButton)
    this.mountHost.appendChild(this.root)
    this.setupResizeObserver()
    this.setupMobileLayoutListener()

    if (this.docBinding && this.docBridge) {
      this.docBridge.subscribeActivated(this.handleDocumentActivated)
      this.docBridge.subscribeToBeOpened(this.handleDocumentToBeOpened)
      this.handleDocumentActivated()
    } else {
      this.renderButtons()
    }
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
    if (this.docBinding && this.docBridge) {
      this.openMode = this.docBridge.getOpenMode()
    }
    this.renderButtons()
  }

  /**
   * Updates document state when {@link AcUiToolbarOptions.docBinding} is false.
   *
   * @param state - Partial hasDocument / openMode overrides.
   */
  setDocumentState(state: Partial<AcUiToolbarDocState>) {
    if (this.docBinding) return
    if (state.hasDocument !== undefined) {
      this.hasDocument = state.hasDocument
    }
    if (state.openMode !== undefined) {
      this.openMode = state.openMode
    }
    this.renderButtons()
  }

  /** Toolbar root element (for hosts that need to query buttons). */
  get element() {
    return this.root
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

  /** Current inset from the docked canvas edge in px. */
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

  /** Current overflow strategy for items that do not fit. */
  getOverflow() {
    return this.overflow
  }

  /**
   * Sets how overflowing items are shown and reclamps toolbar layout.
   *
   * @param overflow - `'menu'` (⋯ popup) or `'scroll'`.
   */
  setOverflow(overflow: AcUiToolbarOverflow) {
    if (this.overflow === overflow) return
    this.overflow = overflow
    this.closeChildrenUi()
    this.syncRootClasses()
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

  /**
   * Enables or disables the collapse/expand toggle at the end of the toolbar.
   *
   * When disabling, expands the toolbar if it was collapsed.
   *
   * @param collapsible - Whether the collapse toggle should be shown.
   */
  setCollapsible(collapsible: boolean) {
    const next = Boolean(collapsible)
    if (Boolean(this.options.collapsible) === next) return
    this.options.collapsible = next
    if (!next && this.collapsed) {
      this.collapsed = false
      this.syncRootClasses()
    }
    this.renderButtons()
  }

  /** Removes listeners, closes dropdowns, and detaches the toolbar DOM. */
  destroy() {
    if (this.layoutFrame !== undefined) {
      cancelAnimationFrame(this.layoutFrame)
      this.layoutFrame = undefined
    }
    this.resizeObserver?.disconnect()
    this.resizeObserver = undefined
    this.teardownMobileLayoutListener()
    this.closeChildrenUi()
    if (this.docBinding && this.docBridge) {
      this.docBridge.unsubscribeActivated(this.handleDocumentActivated)
      this.docBridge.unsubscribeToBeOpened(this.handleDocumentToBeOpened)
    }
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
    if (this.overflow === 'scroll' && !this.collapsed) classes.push('is-scroll')
    if (this.positioning === 'static') classes.push('is-static')
    if (this.overflowFlush === 'x') classes.push('is-overflow-flush-x')
    if (this.overflowFlush === 'y') classes.push('is-overflow-flush-y')
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
    this.itemsEl.replaceChildren()
    this.itemById.clear()
    this.overflowedItems = []
    this.overflowButton.hidden = true
    this.syncOverflowButtonLabel()

    const visibleItems = acuiFilterVisibleToolbarItems(this.items, this.openMode)
    visibleItems.forEach(item => {
      if (acuiIsToolbarSeparatorItem(item)) {
        const separator = document.createElement('div')
        separator.className = 'ml-ex-ui-toolbar-separator'
        separator.setAttribute('role', 'separator')
        if (item.id) {
          separator.dataset.toolbarItemId = item.id
          this.itemById.set(item.id, item)
        }
        this.itemsEl.appendChild(separator)
        return
      }

      this.itemById.set(item.id, item)
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
        this.activateToolbarItem(item, button)
      })

      this.itemsEl.appendChild(button)
    })

    this.root.replaceChildren(this.itemsEl, this.overflowButton)
    this.appendCollapseToggle()
    this.scheduleSyncPosition()
    if (restoreStickyId && !this.collapsed && this.visible) {
      this.openStickyChildrenByParentId(restoreStickyId)
    }
    this.options.onRender?.()
  }

  /**
   * Activates a toolbar item: opens children UI or runs the leaf action/command.
   *
   * @param item - Toolbar item that was chosen.
   * @param button - Visible anchor button (parent, or the overflow button).
   */
  private activateToolbarItem(
    item: AcUiToolbarItem,
    button: HTMLButtonElement
  ) {
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

  private setupMobileLayoutListener() {
    this.teardownMobileLayoutListener()
    if (typeof window.matchMedia !== 'function') return
    this.mobileMql = window.matchMedia(ML_EX_UI_MOBILE_MEDIA_QUERY)
    this.mobileMql.addEventListener('change', this.handleMobileLayoutChange)
  }

  private teardownMobileLayoutListener() {
    this.mobileMql?.removeEventListener('change', this.handleMobileLayoutChange)
    this.mobileMql = undefined
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

    if (this.positioning === 'static') {
      this.root.style.top = ''
      this.root.style.bottom = ''
      this.root.style.left = ''
      this.root.style.right = ''
      this.root.style.transform = ''
      this.root.style.width = ''
      this.root.style.height = ''
      const horizontal = this.isHorizontal()
      if (horizontal) {
        this.root.style.maxWidth = `${Math.max(0, this.mountHost.clientWidth)}px`
        this.root.style.maxHeight = ''
      } else {
        this.root.style.maxHeight = `${Math.max(0, this.mountHost.clientHeight || window.innerHeight)}px`
        this.root.style.maxWidth = ''
      }
      this.syncOverflow()
      return
    }

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
    this.root.style.width = ''
    this.root.style.height = ''

    const placement = this.options.placement
    const horizontal = placement === 'top' || placement === 'bottom'
    if (horizontal) {
      this.root.style.maxWidth = `${Math.max(0, hostWidth - offset * 2)}px`
    } else {
      this.root.style.maxHeight = `${Math.max(0, hostHeight - offset * 2)}px`
    }

    this.syncOverflow()

    const toolbarWidth = this.root.offsetWidth
    const toolbarHeight = this.root.offsetHeight

    if (horizontal) {
      if (this.overflowFlush === 'x') {
        this.root.style.left = '0px'
        this.root.style.width = `${hostWidth}px`
        this.root.style.maxWidth = `${hostWidth}px`
      } else {
        const maxLeft = Math.max(offset, hostWidth - toolbarWidth - offset)
        const idealLeft = (hostWidth - toolbarWidth) / 2
        const left = Math.min(maxLeft, Math.max(offset, idealLeft))
        this.root.style.left = `${left}px`
      }
      if (placement === 'top') {
        this.root.style.top = `${offset}px`
      } else {
        this.root.style.bottom = `${offset}px`
      }
      return
    }

    if (this.overflowFlush === 'y') {
      this.root.style.top = '0px'
      this.root.style.height = `${hostHeight}px`
      this.root.style.maxHeight = `${hostHeight}px`
    } else {
      const maxTop = Math.max(offset, hostHeight - toolbarHeight - offset)
      const idealTop = (hostHeight - toolbarHeight) / 2
      const top = Math.min(maxTop, Math.max(offset, idealTop))
      this.root.style.top = `${top}px`
    }
    if (placement === 'left') {
      this.root.style.left = `${offset}px`
    } else {
      this.root.style.right = `${offset}px`
    }
  }

  /** Hides extra items behind ⋯ or enables scrolling when the host is too small. */
  private syncOverflow() {
    const children = Array.from(this.itemsEl.children) as HTMLElement[]
    for (const child of children) {
      child.hidden = false
      child.classList.remove('is-overflowed')
    }
    this.itemsEl.hidden = false
    this.itemsEl.classList.remove('is-scroll')
    this.itemsEl.style.maxWidth = ''
    this.itemsEl.style.maxHeight = ''
    this.overflowButton.hidden = true
    this.overflowedItems = []
    this.overflowFlush = undefined

    if (this.collapsed || !this.visible) {
      this.syncRootClasses()
      return
    }

    const horizontal = this.isHorizontal()
    const availableInset = this.availableMainSize(false)
    const padding = this.readPadding(this.root, horizontal)
    const rootGap = this.readGap(this.root, horizontal)
    const itemGap = this.readGap(this.itemsEl, horizontal)
    let chrome = padding + this.collapseChromeSize(horizontal, rootGap)

    if (this.overflow === 'scroll') {
      this.itemsEl.classList.add('is-scroll')
      const budget = Math.max(0, availableInset - chrome)
      if (horizontal) {
        this.itemsEl.style.maxWidth = `${budget}px`
      } else {
        this.itemsEl.style.maxHeight = `${budget}px`
      }
      this.syncRootClasses()
      return
    }

    const sizes = children.map(child => this.outerMainSize(child, horizontal))
    const itemsSize = this.totalWithGaps(sizes, itemGap)
    if (itemsSize + chrome <= availableInset + 0.5) {
      this.syncRootClasses()
      return
    }

    this.overflowFlush = horizontal ? 'x' : 'y'
    this.syncRootClasses()

    this.overflowButton.hidden = false
    chrome += rootGap + this.outerMainSize(this.overflowButton, horizontal)
    const budget = Math.max(0, this.availableMainSize(true) - chrome)

    let used = 0
    let lastVisibleIndex = -1
    for (let i = 0; i < children.length; i++) {
      const extra = lastVisibleIndex >= 0 ? itemGap : 0
      const next = used + extra + sizes[i]
      if (next <= budget + 0.5) {
        used = next
        lastVisibleIndex = i
      } else {
        break
      }
    }

    while (
      lastVisibleIndex >= 0 &&
      children[lastVisibleIndex].getAttribute('role') === 'separator'
    ) {
      lastVisibleIndex -= 1
    }

    for (let i = 0; i < children.length; i++) {
      const hide = i > lastVisibleIndex
      children[i].hidden = hide
      children[i].classList.toggle('is-overflowed', hide)
      if (!hide) continue
      const id = children[i].dataset.toolbarItemId
      const item = id ? this.itemById.get(id) : undefined
      if (item && !acuiIsToolbarSeparatorItem(item)) {
        this.overflowedItems.push(acuiResolveEffectiveToolbarItem(item))
      }
    }

    if (this.overflowedItems.length === 0) {
      this.overflowButton.hidden = true
    }
    this.itemsEl.hidden = lastVisibleIndex < 0
  }

  private toggleOverflowMenu() {
    if (this.openParentId === OVERFLOW_PARENT_ID) {
      this.closeChildrenUi()
      return
    }
    this.openOverflowMenu()
  }

  private openOverflowMenu() {
    if (this.overflowedItems.length === 0) return

    this.closeChildrenUi()
    this.openParentId = OVERFLOW_PARENT_ID
    this.markParentOpen(this.overflowButton)

    const dropdown = new AcUiDropdownMenu(
      this.options.i18n,
      this.overflowedItems,
      this.overflowButton,
      this.themeHost
    )
    dropdown.setOnSelect(child => {
      this.activateOverflowItem(child)
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

  private activateOverflowItem(child: AcUiToolbarItem) {
    const item = this.itemById.get(child.id) ?? child
    if (acuiIsToolbarSeparatorItem(item)) return

    const originalButton = this.itemsEl.querySelector<HTMLButtonElement>(
      `[data-toolbar-item-id="${item.id}"]`
    )
    if (
      originalButton?.disabled ||
      (acuiItemRequiresDocument(item) && (this.isDisabled || !this.hasDocument)) ||
      acuiIsToolbarItemDisabled(item)
    ) {
      return
    }

    const anchor = originalButton?.hidden
      ? this.overflowButton
      : (originalButton ?? this.overflowButton)
    this.activateToolbarItem(item, anchor)
  }

  private syncOverflowButtonLabel() {
    const title = this.options.i18n.t('toolbar.more')
    this.overflowButton.title = title
    this.overflowButton.setAttribute('aria-label', title)
  }

  private isHorizontal() {
    return (
      this.options.placement === 'top' || this.options.placement === 'bottom'
    )
  }

  private availableMainSize(flush: boolean) {
    if (this.positioning === 'static') {
      const horizontal = this.isHorizontal()
      if (horizontal) {
        return Math.max(0, this.mountHost.clientWidth || window.innerWidth)
      }
      // Sidebar hosts are often auto-height; use the viewport for overflow.
      const hostHeight = this.mountHost.clientHeight
      return Math.max(
        0,
        hostHeight > 0 ? hostHeight : window.innerHeight - this.edgeOffset * 2
      )
    }
    const offset = flush ? 0 : this.edgeOffset
    return this.isHorizontal()
      ? this.mountHost.clientWidth - offset * 2
      : this.mountHost.clientHeight - offset * 2
  }

  private collapseChromeSize(horizontal: boolean, rootGap: number) {
    if (!this.options.collapsible || this.collapsed) return 0
    const collapseBtn = this.root.querySelector<HTMLElement>(
      '.ml-ex-ui-toolbar-collapse-btn'
    )
    if (!collapseBtn) return 0
    let size = rootGap + this.outerMainSize(collapseBtn, horizontal)
    const separator = Array.from(this.root.children).find(
      child =>
        child instanceof HTMLElement &&
        child.classList.contains('ml-ex-ui-toolbar-separator')
    ) as HTMLElement | undefined
    if (separator) {
      size += rootGap + this.outerMainSize(separator, horizontal)
    }
    return size
  }

  private readPadding(el: HTMLElement, horizontal: boolean) {
    const style = getComputedStyle(el)
    const start = Number.parseFloat(
      horizontal ? style.paddingLeft : style.paddingTop
    )
    const end = Number.parseFloat(
      horizontal ? style.paddingRight : style.paddingBottom
    )
    const startPx = Number.isFinite(start) ? start : TOOLBAR_PADDING_PX
    const endPx = Number.isFinite(end) ? end : TOOLBAR_PADDING_PX
    return startPx + endPx
  }

  private readGap(el: HTMLElement, horizontal: boolean) {
    const style = getComputedStyle(el)
    const axisGap = Number.parseFloat(
      horizontal ? style.columnGap : style.rowGap
    )
    if (Number.isFinite(axisGap) && axisGap > 0) return axisGap
    const gap = Number.parseFloat(style.gap)
    return Number.isFinite(gap) && gap > 0 ? gap : TOOLBAR_GAP_PX
  }

  private outerMainSize(el: HTMLElement, horizontal: boolean) {
    const style = getComputedStyle(el)
    const start = Number.parseFloat(
      horizontal ? style.marginLeft : style.marginTop
    )
    const end = Number.parseFloat(
      horizontal ? style.marginRight : style.marginBottom
    )
    const marginStart = Number.isFinite(start) ? start : 0
    const marginEnd = Number.isFinite(end) ? end : 0
    return (
      (horizontal ? el.offsetWidth : el.offsetHeight) + marginStart + marginEnd
    )
  }

  private totalWithGaps(sizes: number[], gap: number) {
    if (sizes.length === 0) return 0
    return sizes.reduce((sum, size) => sum + size, 0) + gap * (sizes.length - 1)
  }

  /**
   * Seeds submenu selection from {@link AcUiToolbarItem.selectedChildId}.
   *
   * Existing runtime selections are kept so {@link updateItems} can rebuild the
   * item list (locale, toggles) without resetting `childIcon: 'selected'` parents.
   */
  private seedSelectedChildren(items: AcUiToolbarItem[]) {
    for (const item of items) {
      if (acuiIsToolbarSeparatorItem(item)) continue
      if (
        item.childIcon === 'selected' &&
        item.selectedChildId &&
        !this.selectedChildByParent.has(item.id)
      ) {
        this.selectedChildByParent.set(item.id, item.selectedChildId)
      }
    }
  }

  /** Closes any open dropdown or sub-toolbar and clears parent expanded state. */
  private closeChildrenUi() {
    this.openDropdown?.close()
    this.openDropdown = undefined
    this.closeNestedChildrenUi()
    this.openSubToolbar?.close()
    this.openSubToolbar = undefined
    this.clearParentOpenState()
    this.openParentId = undefined
    this.stickyParentId = undefined
  }

  /** Closes a nested sub-toolbar opened from a child with its own children. */
  private closeNestedChildrenUi() {
    this.nestedSubToolbar?.close()
    this.nestedSubToolbar = undefined
    this.nestedParentId = undefined
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
        host: this.themeHost,
        placement: this.options.placement,
        edgeOffset: this.edgeOffset,
        sticky,
        commandsDisabled: this.isDisabled || !this.hasDocument,
        onSelect: child => this.activateChild(item, child, sticky),
        onClose: () => {
          if (this.openSubToolbar === strip) {
            this.closeNestedChildrenUi()
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
    const anchor = button.hidden ? this.overflowButton : button

    const visibleChildren = acuiFilterVisibleToolbarItems(
      item.children,
      this.openMode
    ).map(acuiResolveEffectiveToolbarItem)
    if (visibleChildren.length === 0) return

    this.openChildrenUi(item, anchor, visibleChildren)
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

    const hasChildren =
      Boolean(child.children?.length) || acuiIsDynamicToolbarChildren(child)
    if (hasChildren) {
      if (this.nestedParentId === child.id) {
        this.closeNestedChildrenUi()
        return
      }
      const anchor =
        this.openSubToolbar?.element.querySelector<HTMLElement>(
          `[data-toolbar-item-id="${child.id}"]`
        ) ?? undefined
      if (anchor) {
        this.openNestedChildrenUi(child, anchor)
      }
      return
    }

    if (parent.childIcon === 'selected') {
      this.selectedChildByParent.set(parent.id, child.id)
    }
    if (child.action) {
      child.action()
    } else if (child.command) {
      this.options.onCommand(child.command)
    }

    // Nested leaf selection (e.g. a locale) closes the nested strip.
    if (this.nestedParentId === parent.id) {
      this.closeNestedChildrenUi()
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

  /**
   * Opens a nested dropdown or sub-toolbar for a child that itself has children.
   *
   * @param item - Nested parent item (e.g. locale under settings).
   * @param anchor - Button inside the parent sub-toolbar.
   */
  private openNestedChildrenUi(item: AcUiToolbarItem, anchor: HTMLElement) {
    this.closeNestedChildrenUi()
    const childrenUi = acuiResolveToolbarChildrenUi(item)
    const visibleChildren = acuiFilterVisibleToolbarItems(
      item.children ?? [],
      this.openMode
    ).map(acuiResolveEffectiveToolbarItem)
    if (visibleChildren.length === 0) return

    this.nestedParentId = item.id
    anchor.setAttribute('aria-expanded', 'true')
    anchor.classList.add('is-open')

    if (acuiIsToolbarChildrenStrip(childrenUi)) {
      const sticky = childrenUi === 'sticky-toolbar'
      const strip = new AcUiSubToolbar({
        i18n: this.options.i18n,
        items: visibleChildren,
        anchor,
        toolbarRoot: this.root,
        host: this.themeHost,
        placement: this.options.placement,
        edgeOffset: this.edgeOffset,
        sticky,
        commandsDisabled: this.isDisabled || !this.hasDocument,
        onSelect: nestedChild => this.activateChild(item, nestedChild, sticky),
        onClose: () => {
          if (this.nestedSubToolbar === strip) {
            this.nestedSubToolbar = undefined
            this.nestedParentId = undefined
            anchor.classList.remove('is-open')
            anchor.setAttribute('aria-expanded', 'false')
          }
        }
      })
      this.nestedSubToolbar = strip
      return
    }

    const dropdown = new AcUiDropdownMenu(
      this.options.i18n,
      visibleChildren,
      anchor,
      this.themeHost
    )
    dropdown.setOnSelect(nestedChild => {
      this.activateChild(item, nestedChild, false)
    })
    dropdown.setOnClose(() => {
      this.nestedParentId = undefined
      anchor.classList.remove('is-open')
      anchor.setAttribute('aria-expanded', 'false')
    })
  }
}
