import { createIconElement } from '@mlightcad/cad-simple-viewer/icons'

import {
  isToolbarItemDisabled,
  itemRequiresDocument,
  resolveEffectiveToolbarItem
} from '../config/toolbarItemDisplay'
import { isToolbarSeparatorItem } from '../config/toolbarItemUtils'
import type { AcExToolbarItem, AcExToolbarPlacement } from '../config/types'
import type { AcExToolbarI18n } from './AcExToolbar'
import { isExUiMobileLayout } from './uiLayout'

/** Constructor options for {@link AcExSubToolbar}. */
export interface AcExSubToolbarOptions {
  /** i18n helper for button tooltips. */
  i18n: AcExToolbarI18n
  /** Child items to render. */
  items: AcExToolbarItem[]
  /** Parent toolbar button used for positioning and outside-click exclusion. */
  anchor: HTMLElement
  /** Main toolbar root used to place the strip beside the parent bar. */
  toolbarRoot: HTMLElement
  /** Canvas mount that receives the strip (positioned absolutely). */
  host: HTMLElement
  /** Parent toolbar edge placement. */
  placement: AcExToolbarPlacement
  /** Inset from the docked canvas edge in px. @default 8 */
  edgeOffset?: number
  /**
   * When true, canvas / outside clicks do not close the strip.
   * Only the parent button (or an explicit {@link close}) dismisses it.
   */
  sticky: boolean
  /** Whether command buttons should be disabled (document loading / missing). */
  commandsDisabled: boolean
  /** Invoked when a leaf item is activated. */
  onSelect: (item: AcExToolbarItem) => void
  /** Invoked when the strip is closed. */
  onClose?: () => void
}

/**
 * Icon strip shown beside a parent toolbar button (HTML-export tool-strip model).
 *
 * Sticky strips stay open until the parent is clicked again. Dismissible strips
 * close on outside click, matching a lightweight flyout toolbar.
 */
export class AcExSubToolbar {
  /** Strip root appended to {@link AcExSubToolbarOptions.host}. */
  private root: HTMLDivElement
  /** Child items last passed to the constructor or {@link refresh}. */
  private items: AcExToolbarItem[]
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
  constructor(private options: AcExSubToolbarOptions) {
    this.items = options.items
    this.commandsDisabled = options.commandsDisabled
    this.root = document.createElement('div')
    this.root.className = this.rootClassName()
    this.root.setAttribute('role', 'toolbar')
    const label = options.anchor.getAttribute('aria-label')
    if (label) {
      this.root.setAttribute('aria-label', label)
    }

    this.renderButtons()
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
  refresh(items: AcExToolbarItem[], commandsDisabled?: boolean) {
    this.items = items
    if (commandsDisabled !== undefined) {
      this.commandsDisabled = commandsDisabled
    }
    this.renderButtons()
    this.syncPosition()
  }

  /** Repositions the strip beside the parent toolbar after layout changes. */
  syncPosition() {
    if (!this.root.isConnected) return

    const { host, toolbarRoot, anchor, placement } = this.options
    const gap = 8
    const inset = this.options.edgeOffset ?? 8
    const hostRect = host.getBoundingClientRect()
    const toolbarRect = toolbarRoot.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const hostWidth = host.clientWidth
    const hostHeight = host.clientHeight
    const mobileFullWidth = this.useMobileFullWidthLayout()
    const vertical = placement === 'left' || placement === 'right'

    this.root.classList.remove(
      'is-mobile-fullwidth',
      'is-fullheight',
      'is-evenly',
      'is-wrap'
    )
    this.root.style.width = ''
    this.root.style.maxWidth = ''
    this.root.style.height = ''
    this.root.style.maxHeight = ''

    if (mobileFullWidth) {
      this.root.classList.add('is-mobile-fullwidth')
      const width = Math.max(0, hostWidth - inset * 2)
      // Measure natural single-row width before constraining.
      const naturalWidth = this.root.scrollWidth
      const fits = naturalWidth <= width + 0.5
      this.root.classList.add(fits ? 'is-evenly' : 'is-wrap')
      this.root.style.width = `${width}px`
      this.root.style.maxWidth = `${width}px`
    } else if (vertical) {
      const height = Math.max(0, hostHeight - inset * 2)
      const naturalHeight = this.root.scrollHeight
      if (naturalHeight > height + 0.5) {
        this.root.classList.add('is-fullheight', 'is-wrap')
        this.root.style.height = `${height}px`
        this.root.style.maxHeight = `${height}px`
        // Flex column-wrap does not grow width by itself; set an explicit
        // multi-column width so wrapped columns become visible.
        this.root.style.width = `${this.measureVerticalWrapWidth(height)}px`
        this.root.style.maxWidth = this.root.style.width
      }
    }

    const fullHeightWrap = this.root.classList.contains('is-fullheight')
    const subWidth = this.root.offsetWidth
    const subHeight = this.root.offsetHeight

    let left: number
    let top: number

    if (placement === 'right') {
      left = toolbarRect.left - hostRect.left - subWidth - gap
      top = fullHeightWrap ? inset : anchorRect.top - hostRect.top
    } else if (placement === 'left') {
      left = toolbarRect.right - hostRect.left + gap
      top = fullHeightWrap ? inset : anchorRect.top - hostRect.top
    } else if (placement === 'top') {
      left = mobileFullWidth ? inset : anchorRect.left - hostRect.left
      top = toolbarRect.bottom - hostRect.top + gap
    } else {
      left = mobileFullWidth ? inset : anchorRect.left - hostRect.left
      top = toolbarRect.top - hostRect.top - subHeight - gap
    }

    const maxLeft = Math.max(0, hostWidth - subWidth)
    const maxTop = Math.max(0, hostHeight - subHeight)
    left = Math.min(Math.max(0, left), maxLeft)
    top = Math.min(Math.max(0, top), maxTop)

    this.root.style.left = `${left}px`
    this.root.style.top = `${top}px`
  }

  /**
   * Width needed for a vertical strip to wrap into columns inside `height`.
   *
   * Flexbox column-wrap will not expand the container's width on its own, so
   * callers must set this explicitly for multi-column layout to appear.
   */
  private measureVerticalWrapWidth(height: number): number {
    const children = Array.from(this.root.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    )
    if (children.length === 0) return this.root.offsetWidth

    const style = getComputedStyle(this.root)
    const gap = Number.parseFloat(style.rowGap || style.gap) || 4
    const padX =
      (Number.parseFloat(style.paddingLeft) || 0) +
      (Number.parseFloat(style.paddingRight) || 0)
    const padY =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0)

    const sizes = children.map(child => ({
      width: child.offsetWidth,
      height: child.offsetHeight
    }))
    const colWidth = Math.max(...sizes.map(size => size.width), 0)
    const innerHeight = Math.max(0, height - padY)

    let cols = 1
    let usedInCol = 0
    let itemsInCol = 0
    for (const size of sizes) {
      const extra = itemsInCol > 0 ? gap : 0
      const next = usedInCol + extra + size.height
      if (itemsInCol > 0 && next > innerHeight + 0.5) {
        cols += 1
        usedInCol = size.height
        itemsInCol = 1
      } else {
        usedInCol = next
        itemsInCol += 1
      }
    }

    return padX + cols * colWidth + Math.max(0, cols - 1) * gap
  }

  /** Full-width strip when the parent bar is on the top/bottom edge of a phone. */
  private useMobileFullWidthLayout() {
    const { placement } = this.options
    return (
      (placement === 'top' || placement === 'bottom') && isExUiMobileLayout()
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

  private rootClassName() {
    const vertical =
      this.options.placement === 'left' || this.options.placement === 'right'
    return [
      'ml-ex-ui-subtoolbar',
      vertical ? 'is-vertical' : 'is-horizontal'
    ].join(' ')
  }

  private renderButtons() {
    this.root.replaceChildren()
    this.items.forEach(item => {
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

      const effective = resolveEffectiveToolbarItem(item)
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

      if (effective.icon) {
        button.appendChild(createIconElement(effective.icon))
      } else if (effective.label) {
        const text = document.createElement('span')
        text.textContent = this.options.i18n.t(effective.label)
        text.style.fontSize = '11px'
        text.style.padding = '0 4px'
        button.appendChild(text)
      }

      button.disabled =
        (itemRequiresDocument(effective) && this.commandsDisabled) ||
        isToolbarItemDisabled(effective)

      button.addEventListener('click', event => {
        event.stopPropagation()
        if (button.disabled) return
        this.options.onSelect(effective)
        if (!this.options.sticky) {
          this.close()
        }
      })

      this.root.appendChild(button)
    })
  }
}
