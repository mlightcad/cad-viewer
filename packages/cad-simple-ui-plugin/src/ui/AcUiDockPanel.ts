import {
  acedIsMobileUiLayout,
  ML_UI_MOBILE_MEDIA_QUERY
} from '@mlightcad/cad-simple-viewer'

import {
  createIconElement,
  ICON_CHEVRON_DOWN,
  ICON_DOCK_CLOSE,
  ICON_DOCK_SIDE_MENU,
  ICON_PLACEMENT_BOTTOM,
  ICON_PLACEMENT_LEFT,
  ICON_PLACEMENT_RIGHT,
  ICON_PLACEMENT_TOP
} from '../assets/icons'
import type { AcUiDockPanelSide } from '../config/types'
import type { AcUiI18n } from '../i18n'
import { acuiEnsureUiStyles } from './styles'

const DOCK_MIN_SIZE = 120
const DOCK_MAX_SIZE_RATIO = 0.75
const DOCK_TAB_OVERFLOW_BTN_WIDTH = 28

/** Tab definition for {@link AcUiDockPanel}. */
export interface AcUiDockPanelTab {
  /** Stable tab identifier. */
  id: string
  /** i18n key under the `simpleUi` namespace. */
  labelKey?: string
  /** Plain label when no i18n key is provided. */
  label?: string
  /** Tab content element. */
  content: HTMLElement
}

/** Constructor options for {@link AcUiDockPanel}. */
export interface AcUiDockPanelOptions {
  /** Viewer host element; dock panel is appended as a direct child. */
  host: HTMLElement
  /** i18n helper for labels. */
  i18n: AcUiI18n
  /** Initial dock side. @default 'left' */
  defaultSide?: AcUiDockPanelSide
  /** Whether the panel starts open. @default false */
  defaultOpen?: boolean
  /** Called when the panel is opened (including tab switches while open). */
  onOpen?: () => void
  /** Bottom dock default height in px. @default 240 */
  defaultHeight?: number
  /** Left/right dock default width in px. @default 280 */
  defaultWidth?: number
}

/** Internal tab record with DOM references. */
interface DockTabRecord {
  id: string
  labelKey?: string
  label?: string
  tabButton: HTMLButtonElement
  panel: HTMLDivElement
}

/**
 * Chrome DevTools-style dock panel with tabs, open/close, and dock side selection.
 */
export class AcUiDockPanel {
  private host: HTMLElement
  private readonly i18n: AcUiI18n
  private readonly root: HTMLDivElement
  private readonly contentEl: HTMLDivElement
  private readonly tabsWrap: HTMLDivElement
  private readonly tabsEl: HTMLDivElement
  private readonly overflowButton: HTMLButtonElement
  private readonly bodyEl: HTMLDivElement
  private readonly resizeHandle: HTMLDivElement
  private readonly sideMenuButton: HTMLButtonElement
  private readonly closeButton: HTMLButtonElement
  private readonly sheetChrome: HTMLDivElement
  private readonly sheetGrabber: HTMLDivElement
  private readonly sheetCloseButton: HTMLButtonElement
  private readonly tabs = new Map<string, DockTabRecord>()
  private activeTabId?: string
  private side: AcUiDockPanelSide
  private isPanelOpen: boolean
  private size: number
  private defaultHeight: number
  private defaultWidth: number
  /** Invoked at the start of {@link open} so callers can dismiss sub-toolbars. */
  private readonly onOpen?: () => void
  private sideMenuRoot?: HTMLDivElement
  private overflowMenuRoot?: HTMLDivElement
  private overflowTabIds: string[] = []
  private tabOverflowFrame?: number
  private tabOverflowObserver?: ResizeObserver
  private resizePointerId?: number
  private resizeStartPos = 0
  private resizeStartSize = 0
  /** Element that captured the active resize pointer (handle or sheet grabber). */
  private resizeCaptureTarget?: HTMLElement
  /** Wraps canvas content so only the drawing area shrinks when the dock opens. */
  private dockMainWrapper?: HTMLDivElement
  private mobileMediaQuery?: MediaQueryList

  private handleResizePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !this.isPanelOpen) return
    event.preventDefault()
    this.resizePointerId = event.pointerId
    this.resizeStartPos =
      this.usesVerticalResize() ? event.clientY : event.clientX
    this.resizeStartSize = this.size
    const target =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : this.resizeHandle
    this.resizeCaptureTarget = target
    target.setPointerCapture(event.pointerId)
    document.addEventListener('pointermove', this.handleResizePointerMove)
    document.addEventListener('pointerup', this.handleResizePointerUp)
    document.addEventListener('pointercancel', this.handleResizePointerUp)
  }

  private handleResizePointerMove = (event: PointerEvent) => {
    if (this.resizePointerId !== event.pointerId) return
    event.preventDefault()
    const delta = this.usesPhoneSheet()
      ? this.resizeStartPos - event.clientY
      : this.side === 'bottom'
        ? this.resizeStartPos - event.clientY
        : this.side === 'top'
          ? event.clientY - this.resizeStartPos
          : this.side === 'right'
            ? this.resizeStartPos - event.clientX
            : event.clientX - this.resizeStartPos
    this.setSize(this.resizeStartSize + delta)
  }

  private handleResizePointerUp = (event: PointerEvent) => {
    if (this.resizePointerId !== event.pointerId) return
    this.resizePointerId = undefined
    const captureTarget = this.resizeCaptureTarget ?? this.resizeHandle
    if (captureTarget.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId)
    }
    this.resizeCaptureTarget = undefined
    document.removeEventListener('pointermove', this.handleResizePointerMove)
    document.removeEventListener('pointerup', this.handleResizePointerUp)
    document.removeEventListener('pointercancel', this.handleResizePointerUp)
  }

  private handleDocumentPointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof Node)) return

    if (this.sideMenuRoot) {
      if (
        !this.sideMenuRoot.contains(event.target) &&
        !this.sideMenuButton.contains(event.target)
      ) {
        this.closeSideMenu()
      }
    }

    if (this.overflowMenuRoot) {
      if (
        !this.overflowMenuRoot.contains(event.target) &&
        !this.overflowButton.contains(event.target)
      ) {
        this.closeOverflowMenu()
      }
    }
  }

  /**
   * @param options - Host, i18n, and initial layout options.
   */
  constructor(options: AcUiDockPanelOptions) {
    this.host = options.host
    this.i18n = options.i18n
    this.side = options.defaultSide ?? 'left'
    this.isPanelOpen = options.defaultOpen ?? false
    this.defaultHeight = options.defaultHeight ?? 240
    this.defaultWidth = options.defaultWidth ?? 280
    this.onOpen = options.onOpen
    this.size =
      this.side === 'bottom' || this.side === 'top'
        ? this.defaultHeight
        : this.defaultWidth

    acuiEnsureUiStyles()
    this.ensureHostLayout()

    this.root = document.createElement('div')
    this.root.className = 'ml-ex-ui-dock-panel'
    this.root.dataset.side = this.side
    this.root.dataset.open = String(this.isPanelOpen)

    this.resizeHandle = document.createElement('div')
    this.resizeHandle.className = 'ml-ex-ui-dock-resize-handle'
    this.resizeHandle.addEventListener(
      'pointerdown',
      this.handleResizePointerDown
    )

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'ml-ex-ui-dock-content'

    const header = document.createElement('div')
    header.className = 'ml-ex-ui-dock-header'

    this.tabsWrap = document.createElement('div')
    this.tabsWrap.className = 'ml-ex-ui-dock-tabs-wrap'

    this.tabsEl = document.createElement('div')
    this.tabsEl.className = 'ml-ex-ui-dock-tabs'
    this.tabsEl.setAttribute('role', 'tablist')

    this.overflowButton = document.createElement('button')
    this.overflowButton.type = 'button'
    this.overflowButton.className = 'ml-ex-ui-dock-tab-overflow-btn'
    this.overflowButton.hidden = true
    this.overflowButton.textContent = '»'
    this.overflowButton.title = this.i18n.t('dockPanel.moreTabs')
    this.overflowButton.setAttribute(
      'aria-label',
      this.i18n.t('dockPanel.moreTabs')
    )
    this.overflowButton.addEventListener('click', event => {
      event.stopPropagation()
      this.toggleOverflowMenu()
    })

    this.tabsWrap.appendChild(this.tabsEl)
    this.tabsWrap.appendChild(this.overflowButton)

    this.tabOverflowObserver = new ResizeObserver(() => {
      this.scheduleUpdateTabOverflow()
    })
    this.tabOverflowObserver.observe(this.tabsWrap)

    const actions = document.createElement('div')
    actions.className = 'ml-ex-ui-dock-actions'

    this.sideMenuButton = document.createElement('button')
    this.sideMenuButton.type = 'button'
    this.sideMenuButton.className = 'ml-ex-ui-dock-action-btn'
    this.sideMenuButton.title = this.i18n.t('dockPanel.dockSide')
    this.sideMenuButton.setAttribute(
      'aria-label',
      this.i18n.t('dockPanel.dockSide')
    )
    this.sideMenuButton.appendChild(createIconElement(ICON_DOCK_SIDE_MENU))
    this.sideMenuButton.addEventListener('click', event => {
      event.stopPropagation()
      this.toggleSideMenu()
    })

    this.closeButton = document.createElement('button')
    this.closeButton.type = 'button'
    this.closeButton.className = 'ml-ex-ui-dock-action-btn'
    this.closeButton.title = this.i18n.t('dockPanel.close')
    this.closeButton.setAttribute('aria-label', this.i18n.t('dockPanel.close'))
    this.closeButton.appendChild(createIconElement(ICON_DOCK_CLOSE))
    this.closeButton.addEventListener('click', () => this.close())

    actions.appendChild(this.sideMenuButton)
    actions.appendChild(this.closeButton)

    header.appendChild(this.tabsWrap)
    header.appendChild(actions)

    this.bodyEl = document.createElement('div')
    this.bodyEl.className = 'ml-ex-ui-dock-body'

    this.contentEl.appendChild(header)
    this.contentEl.appendChild(this.bodyEl)

    this.sheetChrome = document.createElement('div')
    this.sheetChrome.className = 'ml-ex-ui-dock-sheet-chrome'

    this.sheetGrabber = document.createElement('div')
    this.sheetGrabber.className = 'ml-ex-ui-dock-sheet-grabber'
    this.sheetGrabber.setAttribute('role', 'separator')
    this.sheetGrabber.setAttribute('aria-orientation', 'horizontal')
    this.sheetGrabber.title = this.i18n.t('dockPanel.resize')
    this.sheetGrabber.setAttribute('aria-label', this.i18n.t('dockPanel.resize'))
    this.sheetGrabber.addEventListener('pointerdown', this.handleResizePointerDown)

    this.sheetCloseButton = document.createElement('button')
    this.sheetCloseButton.type = 'button'
    this.sheetCloseButton.className = 'ml-ex-ui-dock-sheet-close'
    this.sheetCloseButton.title = this.i18n.t('dockPanel.close')
    this.sheetCloseButton.setAttribute(
      'aria-label',
      this.i18n.t('dockPanel.close')
    )
    this.sheetCloseButton.appendChild(createIconElement(ICON_CHEVRON_DOWN))
    this.sheetCloseButton.addEventListener('click', () => this.close())

    this.sheetChrome.append(this.sheetGrabber, this.sheetCloseButton)

    this.root.appendChild(this.sheetChrome)
    this.root.appendChild(this.contentEl)
    this.root.appendChild(this.resizeHandle)

    this.ensureDockMainWrapper()
    this.mountToHost()
    this.bindMobileMediaQuery()
    this.applyLayoutState()
  }

  /** Whether a tab with the given id is registered. */
  hasTab(tabId: string) {
    return this.tabs.has(tabId)
  }

  /**
   * Registers a tab with the dock panel.
   *
   * @param tab - Tab definition.
   * @returns `true` when the tab was added; `false` if it already exists or is invalid.
   */
  addTab(tab: AcUiDockPanelTab): boolean {
    if (this.tabs.has(tab.id)) return false
    if (!tab.labelKey && !tab.label) return false

    const tabButtonId = `ml-ex-ui-dock-tab-${tab.id}`
    const panelId = `ml-ex-ui-dock-tabpanel-${tab.id}`

    const tabButton = document.createElement('button')
    tabButton.type = 'button'
    tabButton.className = 'ml-ex-ui-dock-tab'
    tabButton.id = tabButtonId
    tabButton.setAttribute('role', 'tab')
    tabButton.setAttribute('aria-controls', panelId)
    tabButton.dataset.tabId = tab.id
    tabButton.textContent = this.getTabLabel(tab)
    tabButton.addEventListener('click', () => {
      this.openPanel(tab.id)
    })

    const panel = document.createElement('div')
    panel.className = 'ml-ex-ui-dock-tab-panel'
    panel.id = panelId
    panel.setAttribute('role', 'tabpanel')
    panel.setAttribute('aria-labelledby', tabButtonId)
    panel.dataset.tabId = tab.id
    panel.hidden = true
    panel.tabIndex = -1
    panel.appendChild(tab.content)

    this.tabs.set(tab.id, {
      id: tab.id,
      labelKey: tab.labelKey,
      label: tab.label,
      tabButton,
      panel
    })

    this.tabsEl.appendChild(tabButton)
    this.bodyEl.appendChild(panel)

    if (!this.activeTabId) {
      this.setActiveTab(tab.id)
    }
    this.scheduleUpdateTabOverflow()
    return true
  }

  /**
   * Moves the dock panel to a new mount element (for example when the canvas parent
   * becomes available after plugin load).
   *
   * @param newHost - New mount target.
   */
  reparentTo(newHost: HTMLElement) {
    if (this.host === newHost) {
      this.ensureMounted()
      this.applyLayoutState()
      return
    }

    const wasOpen = this.isPanelOpen
    const activeTabId = this.activeTabId

    this.closeSideMenu()
    this.closeOverflowMenu()
    this.releaseDockMainWrapper()
    this.root.remove()
    this.clearHostLayoutClasses()

    this.host = newHost
    this.ensureHostLayout()
    this.ensureDockMainWrapper()
    this.mountToHost()

    this.isPanelOpen = wasOpen
    if (activeTabId && this.tabs.has(activeTabId)) {
      this.setActiveTab(activeTabId)
    }

    this.ensureMounted()
    this.applyLayoutState()
  }

  /** Ensures the panel root is attached to the current mount host. */
  ensureMounted() {
    if (!this.root.isConnected) {
      this.mountToHost()
    }
  }

  /**
   * Removes a tab and its content panel from the dock.
   *
   * @param tabId - Tab identifier to remove.
   */
  removeTab(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    tab.tabButton.remove()
    tab.panel.remove()
    this.tabs.delete(tabId)

    if (this.activeTabId === tabId) {
      const nextTabId = this.tabs.keys().next().value as string | undefined
      this.activeTabId = undefined
      if (nextTabId) {
        this.setActiveTab(nextTabId)
      }
    }
    this.scheduleUpdateTabOverflow()
  }

  /** Whether the dock panel has any registered tabs. */
  get hasTabs() {
    return this.tabs.size > 0
  }

  /**
   * Opens the panel and optionally activates a tab.
   *
   * @param tabId - Tab to activate.
   */
  open(tabId?: string) {
    this.onOpen?.()
    if (tabId) {
      this.setActiveTab(tabId)
    } else if (this.activeTabId) {
      this.setActiveTab(this.activeTabId)
    } else if (this.tabs.size > 0) {
      this.setActiveTab(this.tabs.keys().next().value!)
    }
    this.isPanelOpen = true
    this.ensureMounted()
    this.applyLayoutState()
  }

  /** Closes the panel without destroying it. */
  close() {
    this.isPanelOpen = false
    this.closeSideMenu()
    this.closeOverflowMenu()
    this.applyLayoutState()
  }

  /**
   * Toggles panel visibility; when opening, activates the given tab.
   *
   * @param tabId - Tab to activate when opening.
   */
  toggle(tabId?: string) {
    if (this.isPanelOpen && (!tabId || this.activeTabId === tabId)) {
      this.close()
      return
    }
    this.open(tabId)
  }

  /**
   * Switches dock side and re-mounts within the host.
   *
   * @param side - New dock side.
   */
  setSide(side: AcUiDockPanelSide) {
    if (this.side === side) return
    const previousSide = this.side
    this.side = side
    if (
      (previousSide === 'left' || previousSide === 'right') &&
      (side === 'left' || side === 'right')
    ) {
      // Keep width when switching between left and right.
    } else if (
      (previousSide === 'top' || previousSide === 'bottom') &&
      (side === 'top' || side === 'bottom')
    ) {
      // Keep height when switching between top and bottom.
    } else {
      this.size =
        side === 'bottom' || side === 'top'
          ? this.defaultHeight
          : this.defaultWidth
    }
    this.closeSideMenu()
    this.closeOverflowMenu()
    this.mountToHost()
    this.applyLayoutState()
    this.scheduleUpdateTabOverflow()
  }

  /** Current mount host element for the dock panel root. */
  getMountHost(): HTMLElement {
    return this.host
  }

  /** Whether the panel is currently open. */
  get isOpen() {
    return this.isPanelOpen
  }

  /** Current dock side. */
  getSide(): AcUiDockPanelSide {
    return this.side
  }

  /** Current panel size in px (width for left/right, height for top/bottom). */
  getSize(): number {
    return this.size
  }

  /**
   * Sets panel size in px, clamped to the dock host bounds.
   *
   * @param size - Target size in px.
   */
  setPanelSize(size: number) {
    this.setSize(size)
  }

  /** Current active tab id, if any. */
  get activeTab(): string | undefined {
    return this.activeTabId
  }

  /** Updates tab labels and action button titles after locale change. */
  refreshLocale() {
    for (const tab of this.tabs.values()) {
      tab.tabButton.textContent = this.getTabLabel(tab)
    }
    this.sideMenuButton.title = this.i18n.t('dockPanel.dockSide')
    this.sideMenuButton.setAttribute(
      'aria-label',
      this.i18n.t('dockPanel.dockSide')
    )
    this.closeButton.title = this.i18n.t('dockPanel.close')
    this.closeButton.setAttribute('aria-label', this.i18n.t('dockPanel.close'))
    this.overflowButton.title = this.i18n.t('dockPanel.moreTabs')
    this.overflowButton.setAttribute(
      'aria-label',
      this.i18n.t('dockPanel.moreTabs')
    )
    this.sheetGrabber.title = this.i18n.t('dockPanel.resize')
    this.sheetGrabber.setAttribute('aria-label', this.i18n.t('dockPanel.resize'))
    this.sheetCloseButton.title = this.i18n.t('dockPanel.close')
    this.sheetCloseButton.setAttribute(
      'aria-label',
      this.i18n.t('dockPanel.close')
    )
    if (this.sideMenuRoot) {
      this.renderSideMenuItems()
    }
    if (this.overflowMenuRoot) {
      this.renderOverflowMenuItems()
    }
    this.scheduleUpdateTabOverflow()
  }

  /** Removes the panel from the DOM and cleans up listeners. */
  destroy() {
    document.removeEventListener(
      'pointerdown',
      this.handleDocumentPointerDown,
      true
    )
    document.removeEventListener('pointermove', this.handleResizePointerMove)
    document.removeEventListener('pointerup', this.handleResizePointerUp)
    document.removeEventListener('pointercancel', this.handleResizePointerUp)
    if (this.tabOverflowFrame !== undefined) {
      cancelAnimationFrame(this.tabOverflowFrame)
      this.tabOverflowFrame = undefined
    }
    this.tabOverflowObserver?.disconnect()
    this.tabOverflowObserver = undefined
    this.unbindMobileMediaQuery()
    this.closeSideMenu()
    this.closeOverflowMenu()
    this.releaseDockMainWrapper()
    this.clearHostLayoutClasses()
    this.root.remove()
  }

  private openPanel(tabId: string) {
    this.setActiveTab(tabId)
    this.isPanelOpen = true
    this.applyLayoutState()
  }

  private setActiveTab(tabId: string) {
    if (!this.tabs.has(tabId)) return
    this.activeTabId = tabId
    for (const tab of this.tabs.values()) {
      const active = tab.id === tabId
      tab.tabButton.classList.toggle('is-active', active)
      tab.tabButton.setAttribute('aria-selected', String(active))
      tab.tabButton.tabIndex = active ? 0 : -1
      tab.panel.hidden = !active
      if (active) {
        tab.panel.removeAttribute('aria-hidden')
      } else {
        tab.panel.setAttribute('aria-hidden', 'true')
      }
    }
    this.scheduleUpdateTabOverflow()
  }

  private ensureHostLayout() {
    if (getComputedStyle(this.host).position === 'static') {
      this.host.style.position = 'relative'
    }
    if (!this.host.classList.contains('ml-ex-ui-host-dock')) {
      this.host.classList.add('ml-ex-ui-host-dock')
    }
  }

  /**
   * Groups existing mount-target children so flex shrink applies to the canvas slot only.
   */
  private ensureDockMainWrapper() {
    if (this.dockMainWrapper?.isConnected) return

    const movable: Node[] = []
    Array.from(this.host.childNodes).forEach(child => {
      if (
        child instanceof HTMLElement &&
        child.classList.contains('ml-ex-ui-dock-panel')
      ) {
        return
      }
      movable.push(child)
    })
    if (movable.length === 0) return

    const wrapper = document.createElement('div')
    wrapper.className = 'ml-ex-ui-dock-main'
    movable.forEach(node => wrapper.appendChild(node))
    this.host.appendChild(wrapper)
    this.dockMainWrapper = wrapper
  }

  /** Moves canvas content out of the dock wrapper and restores the original host tree. */
  private releaseDockMainWrapper() {
    if (!this.dockMainWrapper?.isConnected) {
      this.dockMainWrapper = undefined
      return
    }

    while (this.dockMainWrapper.firstChild) {
      this.host.insertBefore(
        this.dockMainWrapper.firstChild,
        this.dockMainWrapper
      )
    }
    this.dockMainWrapper.remove()
    this.dockMainWrapper = undefined
  }

  private clearHostLayoutClasses() {
    this.host.classList.remove(
      'ml-ex-ui-host-dock',
      'ml-ex-ui-host-dock-top',
      'ml-ex-ui-host-dock-bottom',
      'ml-ex-ui-host-dock-left',
      'ml-ex-ui-host-dock-right',
      'ml-ex-ui-host-dock-sheet'
    )
  }

  private mountToHost() {
    this.ensureDockMainWrapper()
    if (this.root.isConnected) {
      this.root.remove()
    }
    if (this.side === 'left' || this.side === 'top') {
      this.host.insertBefore(this.root, this.host.firstChild)
      return
    }
    this.host.appendChild(this.root)
  }

  private applyLayoutState() {
    const phoneSheet = this.usesPhoneSheet()
    this.root.dataset.side = this.side
    this.root.dataset.open = String(this.isPanelOpen)
    this.root.dataset.phoneSheet = String(phoneSheet)
    this.host.classList.remove(
      'ml-ex-ui-host-dock-top',
      'ml-ex-ui-host-dock-bottom',
      'ml-ex-ui-host-dock-left',
      'ml-ex-ui-host-dock-right',
      'ml-ex-ui-host-dock-sheet'
    )
    if (this.isPanelOpen) {
      this.host.classList.add(
        phoneSheet ? 'ml-ex-ui-host-dock-sheet' : `ml-ex-ui-host-dock-${this.side}`
      )
    }
    if (phoneSheet) {
      this.syncPhoneSheetInset()
    } else {
      this.root.style.removeProperty('--ml-ex-ui-phone-sheet-inset')
    }
    this.root.style.setProperty('--ml-ex-ui-dock-size', `${this.size}px`)
    this.scheduleUpdateTabOverflow()
  }

  private setSize(nextSize: number) {
    const maxSize = this.getMaxSize()
    this.size = Math.max(DOCK_MIN_SIZE, Math.min(maxSize, nextSize))
    this.root.style.setProperty('--ml-ex-ui-dock-size', `${this.size}px`)
    this.scheduleUpdateTabOverflow()
  }

  private getMaxSize(): number {
    if (this.usesPhoneSheet() || this.side === 'bottom' || this.side === 'top') {
      const available = this.usesPhoneSheet()
        ? this.host.clientHeight - this.getPhoneChromeInset()
        : this.host.clientHeight
      return Math.max(DOCK_MIN_SIZE, available * DOCK_MAX_SIZE_RATIO)
    }
    return Math.max(DOCK_MIN_SIZE, this.host.clientWidth * DOCK_MAX_SIZE_RATIO)
  }

  /** Whether the dock is shown as a full-width sheet above the phone toolbar. */
  private usesPhoneSheet(): boolean {
    return acedIsMobileUiLayout()
  }

  /** Whether height (rather than width) is resized. */
  private usesVerticalResize(): boolean {
    return this.usesPhoneSheet() || this.side === 'bottom' || this.side === 'top'
  }

  private bindMobileMediaQuery() {
    if (typeof window.matchMedia !== 'function') return
    this.mobileMediaQuery = window.matchMedia(ML_UI_MOBILE_MEDIA_QUERY)
    this.mobileMediaQuery.addEventListener('change', this.handleMobileMediaChange)
  }

  private unbindMobileMediaQuery() {
    this.mobileMediaQuery?.removeEventListener(
      'change',
      this.handleMobileMediaChange
    )
    this.mobileMediaQuery = undefined
  }

  private handleMobileMediaChange = () => {
    if (this.usesPhoneSheet() && this.side !== 'bottom' && this.side !== 'top') {
      this.size = this.defaultHeight
    }
    this.applyLayoutState()
  }

  private syncPhoneSheetInset() {
    this.root.style.setProperty(
      '--ml-ex-ui-phone-sheet-inset',
      `${this.getPhoneChromeInset()}px`
    )
  }

  /** Combined height of the in-host toolbar and any visible sub-toolbars. */
  private getPhoneChromeInset(): number {
    let inset = 0
    const toolbar = this.host.querySelector('.ml-ex-ui-toolbar')
    if (toolbar instanceof HTMLElement && this.isElementVisible(toolbar)) {
      inset += toolbar.offsetHeight
    }
    this.host.querySelectorAll('.ml-ex-ui-subtoolbar').forEach(node => {
      if (node instanceof HTMLElement && this.isElementVisible(node)) {
        inset += node.offsetHeight
      }
    })
    return inset
  }

  private isElementVisible(element: HTMLElement) {
    if (element.hidden) return false
    return element.offsetParent !== null || element.getClientRects().length > 0
  }

  private toggleSideMenu() {
    if (this.sideMenuRoot) {
      this.closeSideMenu()
      return
    }
    this.closeOverflowMenu()
    this.openSideMenu()
  }

  private openSideMenu() {
    this.sideMenuRoot = document.createElement('div')
    this.sideMenuRoot.className = 'ml-ex-ui-dock-side-menu'
    this.sideMenuRoot.setAttribute('role', 'menu')
    this.renderSideMenuItems()

    const rect = this.sideMenuButton.getBoundingClientRect()
    this.host.appendChild(this.sideMenuRoot)
    this.sideMenuRoot.style.top = `${rect.bottom + 4}px`
    this.sideMenuRoot.style.left = `${Math.max(8, rect.right - 160)}px`

    this.syncOutsidePointerListener()
  }

  private renderSideMenuItems() {
    if (!this.sideMenuRoot) return
    this.sideMenuRoot.replaceChildren()

    const sides: Array<{
      side: AcUiDockPanelSide
      labelKey: string
      icon: string
    }> = [
      { side: 'top', labelKey: 'dockPanel.dockTop', icon: ICON_PLACEMENT_TOP },
      {
        side: 'bottom',
        labelKey: 'dockPanel.dockBottom',
        icon: ICON_PLACEMENT_BOTTOM
      },
      {
        side: 'left',
        labelKey: 'dockPanel.dockLeft',
        icon: ICON_PLACEMENT_LEFT
      },
      {
        side: 'right',
        labelKey: 'dockPanel.dockRight',
        icon: ICON_PLACEMENT_RIGHT
      }
    ]

    sides.forEach(entry => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ml-ex-ui-dock-side-menu-item'
      button.setAttribute('role', 'menuitem')
      if (entry.side === this.side) {
        button.classList.add('is-selected')
      }
      button.appendChild(createIconElement(entry.icon))
      const label = document.createElement('span')
      label.textContent = this.i18n.t(entry.labelKey)
      button.appendChild(label)
      button.addEventListener('click', event => {
        event.stopPropagation()
        this.setSide(entry.side)
        this.closeSideMenu()
      })
      this.sideMenuRoot!.appendChild(button)
    })
  }

  private closeSideMenu() {
    this.sideMenuRoot?.remove()
    this.sideMenuRoot = undefined
    this.syncOutsidePointerListener()
  }

  private syncOutsidePointerListener() {
    document.removeEventListener(
      'pointerdown',
      this.handleDocumentPointerDown,
      true
    )
    if (this.sideMenuRoot || this.overflowMenuRoot) {
      document.addEventListener(
        'pointerdown',
        this.handleDocumentPointerDown,
        true
      )
    }
  }

  private scheduleUpdateTabOverflow() {
    if (this.tabOverflowFrame !== undefined) return
    this.tabOverflowFrame = requestAnimationFrame(() => {
      this.tabOverflowFrame = undefined
      this.updateTabOverflow()
    })
  }

  private updateTabOverflow() {
    const tabList = Array.from(this.tabs.values())
    if (tabList.length === 0) {
      this.overflowButton.hidden = true
      this.overflowTabIds = []
      return
    }

    this.overflowButton.hidden = true
    tabList.forEach(tab => {
      tab.tabButton.hidden = false
    })

    const wrapWidth = this.tabsWrap.clientWidth
    if (wrapWidth <= 0) return

    const totalWidth = tabList.reduce(
      (sum, tab) => sum + tab.tabButton.offsetWidth,
      0
    )

    if (totalWidth <= wrapWidth) {
      this.overflowTabIds = []
      this.overflowButton.hidden = true
      this.overflowButton.classList.remove('is-active')
      if (this.overflowMenuRoot) {
        this.closeOverflowMenu()
      }
      return
    }

    const activeId = this.activeTabId ?? tabList[0].id
    const availableWidth = wrapWidth - DOCK_TAB_OVERFLOW_BTN_WIDTH
    const visible = new Set(tabList.map(tab => tab.id))
    const hidden = new Set<string>()

    const sumVisibleWidth = () =>
      tabList
        .filter(tab => visible.has(tab.id))
        .reduce((sum, tab) => sum + tab.tabButton.offsetWidth, 0)

    while (visible.size > 1 && sumVisibleWidth() > availableWidth) {
      let hideId: string | undefined
      for (let index = tabList.length - 1; index >= 0; index -= 1) {
        const id = tabList[index].id
        if (id === activeId || !visible.has(id)) continue
        hideId = id
        break
      }
      if (!hideId) break
      visible.delete(hideId)
      hidden.add(hideId)
    }

    if (!visible.has(activeId)) {
      hidden.delete(activeId)
      visible.add(activeId)
      while (visible.size > 1 && sumVisibleWidth() > availableWidth) {
        let hideId: string | undefined
        for (let index = tabList.length - 1; index >= 0; index -= 1) {
          const id = tabList[index].id
          if (id === activeId || !visible.has(id)) continue
          hideId = id
          break
        }
        if (!hideId) break
        visible.delete(hideId)
        hidden.add(hideId)
      }
    }

    tabList.forEach(tab => {
      tab.tabButton.hidden = hidden.has(tab.id)
    })

    this.overflowTabIds = tabList
      .filter(tab => hidden.has(tab.id))
      .map(tab => tab.id)
    this.overflowButton.hidden = this.overflowTabIds.length === 0
    this.overflowButton.classList.toggle(
      'is-active',
      this.overflowTabIds.includes(activeId)
    )

    if (this.overflowMenuRoot && this.overflowTabIds.length === 0) {
      this.closeOverflowMenu()
    } else if (this.overflowMenuRoot) {
      this.renderOverflowMenuItems()
    }
  }

  private getTabLabel(tab: Pick<DockTabRecord, 'labelKey' | 'label'>) {
    if (tab.label) return tab.label
    if (tab.labelKey) return this.i18n.t(tab.labelKey)
    return ''
  }

  private toggleOverflowMenu() {
    if (this.overflowMenuRoot) {
      this.closeOverflowMenu()
      return
    }
    this.closeSideMenu()
    this.openOverflowMenu()
  }

  private openOverflowMenu() {
    if (this.overflowTabIds.length === 0) return

    this.overflowMenuRoot = document.createElement('div')
    this.overflowMenuRoot.className = 'ml-ex-ui-dock-tab-overflow-menu'
    this.overflowMenuRoot.setAttribute('role', 'menu')
    this.renderOverflowMenuItems()

    const rect = this.overflowButton.getBoundingClientRect()
    this.host.appendChild(this.overflowMenuRoot)
    this.overflowMenuRoot.style.top = `${rect.bottom + 4}px`
    this.overflowMenuRoot.style.left = `${Math.max(8, rect.right - 180)}px`

    this.syncOutsidePointerListener()
  }

  private renderOverflowMenuItems() {
    if (!this.overflowMenuRoot) return
    this.overflowMenuRoot.replaceChildren()

    this.overflowTabIds.forEach(tabId => {
      const tab = this.tabs.get(tabId)
      if (!tab) return

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ml-ex-ui-dock-tab-overflow-menu-item'
      button.setAttribute('role', 'menuitem')
      if (tabId === this.activeTabId) {
        button.classList.add('is-selected')
      }
      button.textContent = this.getTabLabel(tab)
      button.addEventListener('click', event => {
        event.stopPropagation()
        this.openPanel(tabId)
        this.closeOverflowMenu()
      })
      this.overflowMenuRoot!.appendChild(button)
    })
  }

  private closeOverflowMenu() {
    this.overflowMenuRoot?.remove()
    this.overflowMenuRoot = undefined
    this.syncOutsidePointerListener()
  }
}
