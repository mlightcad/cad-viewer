/**
 * Sidebar tool strips for the offline HTML viewer.
 *
 * Matches cad-simple-ui-plugin:
 * - `'sticky-toolbar'`: stays open until the parent is clicked again, or
 *   another first-level button that opens a strip is clicked. Canvas clicks
 *   do not dismiss it. The parent button acts as a toggle.
 * - `'toolbar'`: icon strip that closes on canvas / outside click.
 * - `'menu'`: optional popover (unused by the built-in HTML chrome).
 *
 * @module AcExHtmlToolbarFlyout
 * @packageDocumentation
 */

import type { AcExHtmlLocale } from './AcExHtmlI18n'

/** Strip ids wired by {@link setupAcExHtmlToolbarFlyouts}. */
export type AcExHtmlStripId = 'measure' | 'review' | 'snap' | 'zoom' | 'locale'

/** How a nested strip is dismissed. */
export type AcExHtmlChildrenUi = 'menu' | 'toolbar' | 'sticky-toolbar'

/** Handles returned by {@link setupAcExHtmlToolbarFlyouts}. */
export interface AcExHtmlToolbarFlyoutController {
  /** Closes any open strip. */
  close: () => void
  /** Syncs locale option `active` state after a locale change. */
  refreshLabels: () => void
}

/**
 * Options for wiring first-level parent buttons to their tool strips.
 */
export interface AcExHtmlToolbarFlyoutOptions {
  /**
   * Invoked when a strip item is clicked (same contract as top-level
   * `data-action` toolbar buttons).
   */
  onItemClick: (button: HTMLButtonElement) => void
  /** Applies a locale chosen from the language strip. */
  onLocaleSelect?: (locale: AcExHtmlLocale) => void
  /** Current locale used to highlight the language strip selection. */
  getLocale?: () => AcExHtmlLocale
  /**
   * Called after a strip opens so callers can sync active/toggle states.
   */
  onOpen?: (menuId: AcExHtmlStripId, menuRoot: HTMLElement) => void
  /**
   * Called after a strip closes (including when replaced by another strip).
   */
  onClose?: (menuId: AcExHtmlStripId) => void
}

interface AcExHtmlStripConfig {
  id: AcExHtmlStripId
  sticky: boolean
  btnId: string
  wrapId: string
  stripId: string
}

const STRIPS: AcExHtmlStripConfig[] = [
  {
    id: 'measure',
    sticky: true,
    btnId: 'mlcad-measure-menu-btn',
    wrapId: 'mlcad-measure-strip-wrap',
    stripId: 'mlcad-measure-strip'
  },
  {
    id: 'review',
    sticky: true,
    btnId: 'mlcad-markup-menu-btn',
    wrapId: 'mlcad-markup-strip-wrap',
    stripId: 'mlcad-markup-strip'
  },
  {
    id: 'snap',
    sticky: true,
    btnId: 'mlcad-snap-menu-btn',
    wrapId: 'mlcad-snap-strip-wrap',
    stripId: 'mlcad-snap-strip'
  },
  {
    id: 'zoom',
    sticky: false,
    btnId: 'mlcad-zoom-menu-btn',
    wrapId: 'mlcad-zoom-strip-wrap',
    stripId: 'mlcad-zoom-strip'
  },
  {
    id: 'locale',
    sticky: false,
    btnId: 'mlcad-lang-btn',
    wrapId: 'mlcad-locale-strip-wrap',
    stripId: 'mlcad-locale-strip'
  }
]

/**
 * Copies a child's icon markup onto a parent button (`childIcon: 'selected'`).
 *
 * @param parentId - Parent toolbar button id.
 * @param child - Clicked strip button whose inner HTML becomes the parent icon.
 */
export function setAcExHtmlParentChildIcon(
  parentId: string,
  child: HTMLElement
): void {
  const parent = document.getElementById(parentId)
  if (!parent) return
  parent.innerHTML = child.innerHTML
}

/**
 * Wires Measurement / Review / Snap / Zoom / Language parent buttons to their strips.
 *
 * Sticky parents toggle open/closed. Opening any other strip parent replaces
 * the current strip. Canvas clicks dismiss only non-sticky strips.
 */
export function setupAcExHtmlToolbarFlyouts(
  options: AcExHtmlToolbarFlyoutOptions
): AcExHtmlToolbarFlyoutController {
  const resolved = STRIPS.map(config => ({
    ...config,
    btn: document.getElementById(config.btnId) as HTMLButtonElement | null,
    wrap: document.getElementById(config.wrapId),
    strip: document.getElementById(config.stripId)
  })).filter(entry => entry.btn && entry.wrap)

  let openId: AcExHtmlStripId | null = null

  const find = (id: AcExHtmlStripId) =>
    resolved.find(entry => entry.id === id)

  const syncLocaleSelection = () => {
    const locale = options.getLocale?.()
    const localeStrip = find('locale')?.strip
    localeStrip
      ?.querySelectorAll<HTMLButtonElement>('[data-locale]')
      .forEach(btn => {
        btn.classList.toggle(
          'active',
          btn.getAttribute('data-locale') === locale
        )
      })
  }

  const setStripOpen = (id: AcExHtmlStripId | null) => {
    const previousId = openId
    if (previousId && previousId !== id) {
      options.onClose?.(previousId)
    }

    for (const entry of resolved) {
      const open = entry.id === id
      if (entry.wrap) entry.wrap.hidden = !open
      entry.btn?.classList.toggle('active', open)
      entry.btn?.classList.toggle('is-menu-open', open)
      entry.btn?.setAttribute('aria-expanded', String(open))
    }

    openId = id
    if (!id) return

    const opened = find(id)
    if (id === 'locale') syncLocaleSelection()
    if (opened?.strip) options.onOpen?.(id, opened.strip)
  }

  const close = () => setStripOpen(null)

  const toggle = (id: AcExHtmlStripId) => {
    if (openId === id) {
      close()
      return
    }
    setStripOpen(id)
  }

  for (const entry of resolved) {
    entry.btn?.addEventListener('click', event => {
      event.stopPropagation()
      toggle(entry.id)
    })
  }

  for (const entry of resolved) {
    entry.strip
      ?.querySelectorAll<HTMLButtonElement>('button[data-action]')
      .forEach(btn => {
        btn.addEventListener('click', event => {
          event.stopPropagation()
          options.onItemClick(btn)
          if (!entry.sticky) close()
        })
      })
  }

  find('locale')
    ?.strip?.querySelectorAll<HTMLButtonElement>('button[data-locale]')
    .forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation()
        const locale = btn.getAttribute('data-locale') as AcExHtmlLocale | null
        if (!locale) return
        options.onLocaleSelect?.(locale)
        close()
      })
    })

  const handleDocumentClick = (event: MouseEvent) => {
    if (!openId) return
    const opened = find(openId)
    if (!opened || opened.sticky) return
    if (!(event.target instanceof Node)) return
    if (opened.wrap?.contains(event.target)) return
    if (opened.btn?.contains(event.target)) return
    close()
  }
  document.addEventListener('mousedown', handleDocumentClick, true)

  return {
    close,
    refreshLabels: () => {
      syncLocaleSelection()
    }
  }
}
