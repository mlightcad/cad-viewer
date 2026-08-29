/**
 * Layout-switcher dropdown for the offline HTML viewer toolbar.
 *
 * Matches cad-simple-ui-plugin: a first-level button with `childrenUi: 'menu'`
 * lists every exported layout; choosing one switches the current layout.
 *
 * @module AcExHtmlLayoutMenu
 * @packageDocumentation
 */

import { ML_UI_MOBILE_MAX_WIDTH } from './AcExHtmlShell'
import type { AcExLayoutSnapshot } from './AcExSnapshotTypes'

/** Handles returned by {@link setupAcExHtmlLayoutMenu}. */
export interface AcExHtmlLayoutMenuController {
  /** Closes the dropdown if it is open. */
  close: () => void
  /** Rebuilds item `active` state after a layout switch. */
  refresh: () => void
}

/** Dependencies for {@link setupAcExHtmlLayoutMenu}. */
export interface AcExHtmlLayoutMenuOptions {
  /** Exported layouts in display (tab) order. */
  layouts: Pick<AcExLayoutSnapshot, 'btrId' | 'name'>[]
  /** BTR id of the layout currently shown. */
  getActiveLayoutBtrId: () => string
  /**
   * Called when the user chooses a layout. No-op when the id is already active.
   */
  onSelect: (btrId: string) => void
  /** Closes sibling flyout strips before opening this menu. */
  closeOtherFlyouts?: () => void
}

/**
 * Wires the layout toolbar button to a popover listing every snapshot layout.
 */
export function setupAcExHtmlLayoutMenu(
  options: AcExHtmlLayoutMenuOptions
): AcExHtmlLayoutMenuController {
  const btn = document.getElementById(
    'mlcad-layout-menu-btn'
  ) as HTMLButtonElement | null
  if (!btn || options.layouts.length === 0) {
    return { close: () => {}, refresh: () => {} }
  }

  let menu: HTMLDivElement | null = null

  const isOpen = () => menu != null

  const syncButton = () => {
    const open = isOpen()
    btn.classList.toggle('active', open)
    btn.classList.toggle('is-menu-open', open)
    btn.setAttribute('aria-expanded', String(open))
  }

  const close = () => {
    if (!menu) return
    document.removeEventListener('mousedown', handleDocumentClick, true)
    menu.remove()
    menu = null
    syncButton()
  }

  const handleDocumentClick = (event: MouseEvent) => {
    if (!(event.target instanceof Node)) return
    if (menu?.contains(event.target)) return
    if (btn.contains(event.target)) return
    close()
  }

  const positionNear = (root: HTMLDivElement) => {
    const rect = btn.getBoundingClientRect()
    const menuRect = root.getBoundingClientRect()
    const phone =
      typeof window !== 'undefined' &&
      window.matchMedia?.(`(max-width: ${ML_UI_MOBILE_MAX_WIDTH}px)`).matches

    let top: number
    let left: number

    if (phone) {
      // Open upward above the bottom toolbar.
      top = rect.top - menuRect.height - 8
      left = Math.max(8, Math.min(rect.left, window.innerWidth - menuRect.width - 8))
      if (top < 8) {
        top = Math.min(rect.bottom + 8, window.innerHeight - menuRect.height - 8)
      }
    } else {
      top = rect.top
      left = rect.right + 8

      if (left + menuRect.width > window.innerWidth - 8) {
        left = Math.max(8, rect.left - menuRect.width - 8)
      }
      if (top + menuRect.height > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - menuRect.height - 8)
      }
    }

    root.style.top = `${Math.max(8, top)}px`
    root.style.left = `${Math.max(8, left)}px`
  }

  const markActive = (root: HTMLElement) => {
    const activeId = options.getActiveLayoutBtrId()
    root
      .querySelectorAll<HTMLButtonElement>('[data-layout-id]')
      .forEach(item => {
        const selected = item.getAttribute('data-layout-id') === activeId
        item.classList.toggle('active', selected)
        item.classList.toggle('is-toggled', selected)
        item.setAttribute('aria-pressed', String(selected))
      })
  }

  const open = () => {
    if (menu) return
    options.closeOtherFlyouts?.()

    const root = document.createElement('div')
    root.className = 'mlcad-dropdown'
    root.setAttribute('role', 'menu')
    root.setAttribute('aria-labelledby', 'mlcad-layout-menu-btn')

    for (const layout of options.layouts) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'mlcad-dropdown-item'
      item.setAttribute('role', 'menuitem')
      item.dataset.layoutId = layout.btrId
      item.title = layout.name

      const label = document.createElement('span')
      label.className = 'mlcad-dropdown-label'
      label.textContent = layout.name
      item.appendChild(label)

      item.addEventListener('click', event => {
        event.stopPropagation()
        close()
        if (layout.btrId === options.getActiveLayoutBtrId()) return
        options.onSelect(layout.btrId)
      })
      root.appendChild(item)
    }

    document.body.appendChild(root)
    markActive(root)
    positionNear(root)
    menu = root
    document.addEventListener('mousedown', handleDocumentClick, true)
    syncButton()
  }

  const toggle = () => {
    if (isOpen()) close()
    else open()
  }

  btn.addEventListener('click', event => {
    event.stopPropagation()
    toggle()
  })

  return {
    close,
    refresh: () => {
      if (menu) markActive(menu)
    }
  }
}
