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
import type { AcUiToolbarItem, AcUiToolbarPlacement } from '../config/types'
import type { AcUiI18n } from '../i18n'
import { acuiEnsureUiStyles } from './styles'

/** Constructor options for {@link AcUiSubToolbar}. */
export interface AcUiSubToolbarOptions {
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
}

/**
 * Icon strip shown beside a parent toolbar button (HTML-export tool-strip model).
 *
 * Sticky strips stay open until the parent is clicked again. Dismissible strips
 * close on outside click, matching a lightweight flyout toolbar.
 */
export class AcUiSubToolbar {
  /** Strip root appended to {@link AcUiSubToolbarOptions.host}. */
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
    this.close()
  }

  /**
   * @param options - Host, placement, items, and selection callback.
   */
  constructor(private options: AcUiSubToolbarOptions) {
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

  /** Repositions the strip beside the parent toolbar after layout changes. */
  syncPosition() {
    if (!this.root.isConnected) return

    const { host, toolbarRoot, anchor, placement, chrome } = this.options
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
      top = anchorRect.top - hostRect.top
    } else if (placement === 'left') {
      left = toolbarRect.right - hostRect.left + gap
      top = anchorRect.top - hostRect.top
    } else if (placement === 'top') {
      left = stretch
        ? crossInset.near
        : anchorRect.left - hostRect.left
      top = toolbarRect.bottom - hostRect.top + gap
    } else {
      left = stretch
        ? crossInset.near
        : anchorRect.left - hostRect.left
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

  /** Detaches the strip and removes the outside-click listener. */
  close() {
    if (this.closed) return
    this.closed = true
    document.removeEventListener('mousedown', this.handleDocumentClick, true)
    this.root.remove()
    this.options.onClose?.()
  }

  private syncRootClasses() {
    const vertical =
      this.options.placement === 'left' || this.options.placement === 'right'
    const { chrome } = this.options
    const classes = [
      'ml-ex-ui-subtoolbar',
      vertical ? 'is-vertical' : 'is-horizontal'
    ]
    if (chrome.showLabels) classes.push('has-labels')
    if (chrome.size === 'stretch') classes.push('is-stretch')
    if (chrome.overflow === 'wrap') classes.push('is-overflow-wrap')
    if (!chrome.showBorder) classes.push('no-border')
    this.root.className = classes.join(' ')
  }

  private applyChromeLayout() {
    this.applyStretchSize()
    this.applyOverflowLayout()
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
