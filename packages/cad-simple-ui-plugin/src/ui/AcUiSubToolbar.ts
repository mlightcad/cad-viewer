import { createIconElement } from '../assets/icons'
import type { AcUiResolvedToolbarChrome } from '../config/resolveToolbarChrome'
import {
  acuiIsToolbarItemDisabled,
  acuiItemRequiresDocument,
  acuiResolveEffectiveToolbarItem
} from '../config/resolveToolbarItems'
import {
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarSeparatorItem
} from '../config/toolbarItemUtils'
import type {
  AcUiSubToolbarPosition,
  AcUiToolbarItem,
  AcUiToolbarPlacement
} from '../config/types'
import type { AcUiI18n } from '../i18n'
import { acuiComputeWrapPackSlot } from './acuiWrapPackLayout'
import { acuiEnsureUiStyles } from './styles'

/** Constructor options for {@link AcUiSubToolbar}. */
export interface AcUiSubToolbarMountOptions {
  /** i18n helper for button tooltips. */
  i18n: AcUiI18n
  /** Child items to render. */
  items: AcUiToolbarItem[]
  /** Parent toolbar button used for positioning and outside-click exclusion. */
  anchor: HTMLElement
  /** Main toolbar root used to place the strip beside the parent bar. */
  toolbarRoot: HTMLElement
  /** Canvas mount that receives the strip (positioned absolutely). */
  host: HTMLElement
  /** Parent toolbar edge placement. */
  placement: AcUiToolbarPlacement
  /** Resolved layout and chrome options. */
  chrome: AcUiResolvedToolbarChrome
  /**
   * Aligns the strip along the parent toolbar axis.
   * @default 'front'
   */
  position?: AcUiSubToolbarPosition
  /** Cross-axis host margins inherited from the parent toolbar. */
  getCrossAxisInset: () => { near: number; far: number }
  /**
   * When true, canvas / outside clicks do not close the strip.
   * Only the parent button (or an explicit {@link close}) dismisses it.
   */
  sticky: boolean
  /** Whether command buttons should be disabled (document loading / missing). */
  commandsDisabled: boolean
  /** Invoked when a leaf item is activated. */
  onSelect: (item: AcUiToolbarItem, button: HTMLButtonElement) => void
  /** Invoked when the strip is closed. */
  onClose?: () => void
  /**
   * Keeps a dismissible strip open when the event target lies in related UI
   * (for example a nested sub-toolbar opened from this strip).
   */
  shouldKeepOpenForTarget?: (target: Node) => boolean
}

/**
 * Icon strip shown beside a parent toolbar button (HTML-export tool-strip model).
 *
 * Sticky strips stay open until the parent is clicked again. Dismissible strips
 * close on outside click, matching a lightweight flyout toolbar.
 */
export class AcUiSubToolbar {
  /** Strip root appended to {@link AcUiSubToolbarMountOptions.host}. */
  private root: HTMLDivElement
  /** Child items last passed to the constructor or {@link refresh}. */
  private items: AcUiToolbarItem[]
  /** Whether command buttons are disabled. */
  private commandsDisabled: boolean
  /** Whether {@link close} has already run. */
  private closed = false
  /** Closes a dismissible strip when the user clicks outside. */
  private handleDocumentClick = (event: MouseEvent) => {
    if (this.options.sticky) return
    if (!(event.target instanceof Node)) return
    if (this.root.contains(event.target)) return
    if (this.options.anchor.contains(event.target)) return
    if (this.options.shouldKeepOpenForTarget?.(event.target)) return
    this.close()
  }

  /**
   * @param options - Host, placement, items, and selection callback.
   */
  constructor(private options: AcUiSubToolbarMountOptions) {
    acuiEnsureUiStyles()
    this.items = options.items
    this.commandsDisabled = options.commandsDisabled
    this.root = document.createElement('div')
    this.syncRootClasses()
    this.root.setAttribute('role', 'toolbar')
    const label = options.anchor.getAttribute('aria-label')
    if (label) {
      this.root.setAttribute('aria-label', label)
    }

    this.renderButtons()
    this.applyChromeLayout()
    options.host.appendChild(this.root)
    this.syncPosition()

    if (!options.sticky) {
      document.addEventListener('mousedown', this.handleDocumentClick, true)
    }
  }

  /** Whether this strip ignores canvas / outside clicks. */
  get sticky() {
    return this.options.sticky
  }

  /** Parent button that opened this strip. */
  get anchor() {
    return this.options.anchor
  }

  /** Strip root element (used when stacking nested strips). */
  get rootElement() {
    return this.root
  }

  /**
   * Hides or shows the strip without destroying it (used when
   * {@link AcUiSubToolbarOptions.replaceOnNested} replaces this strip with a
   * nested one).
   *
   * @param hidden - When true, the strip is not visible and does not receive
   *   pointer events.
   */
  setHidden(hidden: boolean) {
    this.root.hidden = hidden
    this.root.style.visibility = hidden ? 'hidden' : ''
    this.root.style.pointerEvents = hidden ? 'none' : ''
  }

  /**
   * Replaces child items and re-renders without closing the strip.
   *
   * @param items - Updated child items (e.g. after a toggle).
   * @param commandsDisabled - Optional override for command disabled state.
   */
  refresh(items: AcUiToolbarItem[], commandsDisabled?: boolean) {
    this.items = items
    if (commandsDisabled !== undefined) {
      this.commandsDisabled = commandsDisabled
    }
    this.renderButtons()
    this.applyChromeLayout()
    this.syncPosition()
  }

  /** Whether `target` lies inside this strip root. */
  containsTarget(target: Node): boolean {
    return this.root.contains(target)
  }

  /** Updates button labels and tooltips after locale change. */
  refreshLocale() {
    const { chrome } = this.options
    for (const button of Array.from(
      this.root.querySelectorAll<HTMLButtonElement>('.ml-ex-ui-toolbar-btn')
    )) {
      const itemId = button.dataset.toolbarItemId
      if (!itemId) continue
      const item = this.items.find(candidate => candidate.id === itemId)
      if (!item || acuiIsToolbarSeparatorItem(item)) continue
      const effective = acuiResolveEffectiveToolbarItem(item)
      const label = effective.label
        ? this.options.i18n.t(effective.label)
        : effective.id
      button.title = label
      button.setAttribute('aria-label', label)
      const labelEl = button.querySelector('.ml-ex-ui-toolbar-btn-label')
      if (labelEl) {
        labelEl.textContent = label
      } else if (effective.label && !chrome.showLabels) {
        const text = button.querySelector('span')
        if (text) text.textContent = label
      }
    }
  }

  /** Repositions the strip beside the parent toolbar after layout changes. */
  syncPosition() {
    if (!this.root.isConnected) return

    // Recompute stretch width and wrap-pack slots before measuring — host
    // resize only calls syncPosition, not a full remount.
    if (!this.root.hidden) {
      this.applyChromeLayout()
    }

    const { host, toolbarRoot, anchor, placement, chrome } = this.options
    const position = this.options.position ?? 'front'
    const gap = chrome.edgeOffset
    const hostRect = host.getBoundingClientRect()
    const toolbarRect = toolbarRoot.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const subWidth = this.root.offsetWidth
    const subHeight = this.root.offsetHeight
    const hostWidth = host.clientWidth
    const hostHeight = host.clientHeight
    const crossInset = this.options.getCrossAxisInset()
    const horizontalStrip =
      placement === 'left' || placement === 'right'
    const stretch = chrome.size === 'stretch'

    let left: number
    let top: number

    if (placement === 'right') {
      left = toolbarRect.left - hostRect.left - subWidth - gap
      top = stretch
        ? crossInset.near
        : this.resolveMainAxisOffset({
            position,
            axis: 'vertical',
            toolbarRect,
            hostRect,
            anchorRect,
            subSize: subHeight
          })
    } else if (placement === 'left') {
      left = toolbarRect.right - hostRect.left + gap
      top = stretch
        ? crossInset.near
        : this.resolveMainAxisOffset({
            position,
            axis: 'vertical',
            toolbarRect,
            hostRect,
            anchorRect,
            subSize: subHeight
          })
    } else if (placement === 'top') {
      left = stretch
        ? crossInset.near
        : this.resolveMainAxisOffset({
            position,
            axis: 'horizontal',
            toolbarRect,
            hostRect,
            anchorRect,
            subSize: subWidth
          })
      top = toolbarRect.bottom - hostRect.top + gap
    } else {
      left = stretch
        ? crossInset.near
        : this.resolveMainAxisOffset({
            position,
            axis: 'horizontal',
            toolbarRect,
            hostRect,
            anchorRect,
            subSize: subWidth
          })
      top = toolbarRect.top - hostRect.top - subHeight - gap
    }

    if (horizontalStrip) {
      const minTop = crossInset.near
      const maxTop = Math.max(minTop, hostHeight - subHeight - crossInset.far)
      top = Math.min(Math.max(minTop, top), maxTop)
      if (stretch) {
        left = crossInset.near
      }
    } else {
      const minLeft = crossInset.near
      const maxLeft = Math.max(minLeft, hostWidth - subWidth - crossInset.far)
      left = stretch
        ? crossInset.near
        : Math.min(Math.max(minLeft, left), maxLeft)
      const minTop = crossInset.near
      const maxTop = Math.max(minTop, hostHeight - subHeight - crossInset.far)
      top = Math.min(Math.max(minTop, top), maxTop)
    }

    this.root.style.left = `${left}px`
    this.root.style.top = `${top}px`
  }

  /**
   * Resolves left (horizontal strip) or top (vertical strip) from
   * {@link AcUiSubToolbarPosition}.
   */
  private resolveMainAxisOffset(args: {
    position: AcUiSubToolbarPosition
    axis: 'horizontal' | 'vertical'
    toolbarRect: DOMRect
    hostRect: DOMRect
    anchorRect: DOMRect
    subSize: number
  }): number {
    const { position, axis, toolbarRect, hostRect, anchorRect, subSize } = args

    if (position === 'auto') {
      return axis === 'horizontal'
        ? anchorRect.left - hostRect.left
        : anchorRect.top - hostRect.top
    }

    if (position === 'center') {
      return axis === 'horizontal'
        ? toolbarRect.left - hostRect.left + (toolbarRect.width - subSize) / 2
        : toolbarRect.top - hostRect.top + (toolbarRect.height - subSize) / 2
    }

    const toolbarButtons = this.queryVisibleButtons(this.options.toolbarRoot)
    const subButtons = this.queryVisibleButtons(this.root)
    const toolbarEdge =
      position === 'front'
        ? toolbarButtons[0]
        : toolbarButtons[toolbarButtons.length - 1]
    const subEdge =
      position === 'front' ? subButtons[0] : subButtons[subButtons.length - 1]

    if (!toolbarEdge || !subEdge) {
      if (position === 'front') {
        return axis === 'horizontal'
          ? toolbarRect.left - hostRect.left
          : toolbarRect.top - hostRect.top
      }
      return axis === 'horizontal'
        ? toolbarRect.right - hostRect.left - subSize
        : toolbarRect.bottom - hostRect.top - subSize
    }

    const toolbarEdgeRect = toolbarEdge.getBoundingClientRect()
    const rootRect = this.root.getBoundingClientRect()
    const subEdgeRect = subEdge.getBoundingClientRect()

    if (axis === 'horizontal') {
      if (position === 'front') {
        const subOffset = subEdgeRect.left - rootRect.left
        return toolbarEdgeRect.left - hostRect.left - subOffset
      }
      const subOffset = subEdgeRect.left - rootRect.left
      return (
        toolbarEdgeRect.right - hostRect.left - subOffset - subEdgeRect.width
      )
    }

    if (position === 'front') {
      const subOffset = subEdgeRect.top - rootRect.top
      return toolbarEdgeRect.top - hostRect.top - subOffset
    }
    const subOffset = subEdgeRect.top - rootRect.top
    return (
      toolbarEdgeRect.bottom - hostRect.top - subOffset - subEdgeRect.height
    )
  }

  /** Visible toolbar buttons used for front/end edge alignment. */
  private queryVisibleButtons(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>('.ml-ex-ui-toolbar-btn:not([hidden])')
    )
  }

  /** Detaches the strip and removes the outside-click listener. */
  close() {
    if (this.closed) return
    this.closed = true
    document.removeEventListener('mousedown', this.handleDocumentClick, true)
    this.root.remove()
    this.options.onClose?.()
  }

  private syncRootClasses() {
    const { chrome, placement } = this.options
    const vertical = placement === 'left' || placement === 'right'
    const classes = [
      'ml-ex-ui-subtoolbar',
      `is-${placement}`,
      vertical ? 'is-vertical' : 'is-horizontal'
    ]
    if (chrome.showLabels) classes.push('has-labels')
    if (chrome.size === 'stretch') classes.push('is-stretch')
    if (chrome.overflow === 'wrap') classes.push('is-overflow-wrap')
    if (!chrome.showBorder) classes.push('no-border')
    if (chrome.showButtonBorder) classes.push('show-button-border')
    if (chrome.showChildrenIndicator) classes.push('show-children-indicator')
    this.root.className = classes.join(' ')
  }

  private applyChromeLayout() {
    this.applyStretchSize()
    this.applyOverflowLayout()
    this.applyWrapPackLayout()
    this.applyLabeledButtonMaxWidth()
  }

  /**
   * Caps labeled button width slightly below height so icon+label buttons stay
   * portrait-shaped and long captions ellipsize. Skipped when wrap-pack already
   * assigned slot widths (full rows fill the strip evenly).
   */
  private applyLabeledButtonMaxWidth() {
    const { chrome } = this.options
    if (!chrome.showLabels || this.root.classList.contains('is-wrap-pack')) {
      if (!chrome.showLabels) {
        for (const button of this.queryVisibleButtons(this.root)) {
          button.style.removeProperty('max-width')
        }
      }
      return
    }
    for (const button of this.queryVisibleButtons(this.root)) {
      const height = button.offsetHeight
      if (height <= 0) continue
      button.style.maxWidth = `${Math.max(24, height - 4)}px`
    }
  }

  /**
   * Stretch + wrap horizontal strips:
   * - Full rows fill the strip evenly.
   * - A short last row (when there are prior full rows) keeps that slot width
   *   and stays left-aligned.
   * - A single incomplete row stretches buttons across the full strip.
   */
  private applyWrapPackLayout() {
    const { chrome, placement, host } = this.options
    const horizontalStrip = placement === 'top' || placement === 'bottom'
    const buttons = this.queryVisibleButtons(this.root)

    const clearInlineSizing = () => {
      for (const button of buttons) {
        button.style.removeProperty('flex')
        button.style.removeProperty('width')
        button.style.removeProperty('max-width')
        delete button.dataset.wrapPackRow
      }
    }

    if (
      !horizontalStrip ||
      chrome.size !== 'stretch' ||
      chrome.overflow !== 'wrap'
    ) {
      this.root.classList.remove('is-wrap-pack')
      clearInlineSizing()
      return
    }

    if (buttons.length === 0) return

    // Prefer the laid-out content width (excludes border). Fall back to the
    // host stretch target when the box has not been measured yet.
    const crossInset = this.options.getCrossAxisInset()
    const stretchWidth = Math.max(
      0,
      host.clientWidth - crossInset.near - crossInset.far
    )
    if (stretchWidth > 0 && this.root.style.width !== `${stretchWidth}px`) {
      this.root.style.width = `${stretchWidth}px`
    }
    const containerWidth =
      this.root.clientWidth > 0 ? this.root.clientWidth : stretchWidth
    if (containerWidth <= 0) {
      this.root.classList.remove('is-wrap-pack')
      clearInlineSizing()
      return
    }

    for (const button of buttons) {
      button.style.flex = '0 0 auto'
      button.style.width = 'auto'
      button.style.removeProperty('max-width')
    }

    const height = Math.max(...buttons.map(button => button.offsetHeight), 1)
    const { perRow, slotWidth } = acuiComputeWrapPackSlot(
      containerWidth,
      height,
      buttons.length
    )
    this.root.classList.add('is-wrap-pack')

    const singleRow = buttons.length <= perRow
    const fullRowCount = singleRow
      ? buttons.length
      : Math.floor(buttons.length / perRow) * perRow
    buttons.forEach((button, index) => {
      button.style.flex = `0 0 ${slotWidth}px`
      button.style.width = `${slotWidth}px`
      button.style.maxWidth = `${slotWidth}px`
      button.dataset.wrapPackRow =
        singleRow || index < fullRowCount ? 'full' : 'last'
    })
  }

  private applyStretchSize() {
    const { host, placement, chrome } = this.options
    if (chrome.size !== 'stretch') {
      this.root.style.removeProperty('width')
      this.root.style.removeProperty('height')
      return
    }

    const crossInset = this.options.getCrossAxisInset()
    const horizontalStrip = placement === 'left' || placement === 'right'

    if (horizontalStrip) {
      const stretchHeight = Math.max(
        0,
        host.clientHeight - crossInset.near - crossInset.far
      )
      this.root.style.height = `${stretchHeight}px`
      this.root.style.removeProperty('width')
    } else {
      const stretchWidth = Math.max(
        0,
        host.clientWidth - crossInset.near - crossInset.far
      )
      this.root.style.width = `${stretchWidth}px`
      this.root.style.removeProperty('height')
    }
  }

  private applyOverflowLayout() {
    const { host, placement, chrome } = this.options
    if (chrome.overflow !== 'wrap') {
      if (chrome.size !== 'stretch') {
        this.root.style.removeProperty('--ml-ex-ui-toolbar-max-width')
        this.root.style.removeProperty('--ml-ex-ui-toolbar-max-height')
      }
      return
    }

    const crossInset = this.options.getCrossAxisInset()
    const horizontalStrip = placement === 'left' || placement === 'right'

    if (horizontalStrip) {
      const maxHeight = Math.max(
        0,
        host.clientHeight - crossInset.near - crossInset.far
      )
      this.root.style.setProperty(
        '--ml-ex-ui-toolbar-max-height',
        `${maxHeight}px`
      )
      this.root.style.removeProperty('--ml-ex-ui-toolbar-max-width')
    } else {
      const maxWidth = Math.max(
        0,
        host.clientWidth - crossInset.near - crossInset.far
      )
      this.root.style.setProperty(
        '--ml-ex-ui-toolbar-max-width',
        `${maxWidth}px`
      )
      this.root.style.removeProperty('--ml-ex-ui-toolbar-max-height')
    }
  }

  private renderButtons() {
    this.root.replaceChildren()
    const { chrome } = this.options
    this.items.forEach(item => {
      if (acuiIsToolbarSeparatorItem(item)) {
        if (!chrome.showSeparators) return
        const separator = document.createElement('div')
        separator.className = 'ml-ex-ui-toolbar-separator'
        separator.setAttribute('role', 'separator')
        if (item.id) {
          separator.dataset.toolbarItemId = item.id
        }
        this.root.appendChild(separator)
        return
      }

      const effective = acuiResolveEffectiveToolbarItem(item)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ml-ex-ui-toolbar-btn'
      button.title = effective.label
        ? this.options.i18n.t(effective.label)
        : effective.id
      button.setAttribute('aria-label', button.title)
      button.dataset.toolbarItemId = effective.id

      if (effective.toggle) {
        const pressed = effective.toggle.getValue()
        button.setAttribute('aria-pressed', String(pressed))
        button.classList.toggle('is-toggled', pressed)
      }

      if (effective.children?.length || acuiIsDynamicToolbarChildren(item)) {
        button.classList.add('has-children')
        button.setAttribute('aria-haspopup', 'true')
        button.setAttribute('aria-expanded', 'false')
      }

      if (effective.icon) {
        button.appendChild(createIconElement(effective.icon))
      } else if (effective.label && !chrome.showLabels) {
        const text = document.createElement('span')
        text.textContent = this.options.i18n.t(effective.label)
        text.style.fontSize = '11px'
        text.style.padding = '0 4px'
        button.appendChild(text)
      }

      if (chrome.showLabels && effective.label) {
        const label = document.createElement('span')
        label.className = 'ml-ex-ui-toolbar-btn-label'
        label.textContent = this.options.i18n.t(effective.label)
        button.appendChild(label)
      }

      button.disabled =
        (acuiItemRequiresDocument(effective) && this.commandsDisabled) ||
        acuiIsToolbarItemDisabled(effective)

      button.addEventListener('click', event => {
        event.stopPropagation()
        if (button.disabled) return
        this.options.onSelect(effective, button)
        const hasNestedChildren =
          Boolean(effective.children?.length) ||
          acuiIsDynamicToolbarChildren(item)
        if (!this.options.sticky && !hasNestedChildren) {
          this.close()
        }
      })

      this.root.appendChild(button)
    })
  }
}
