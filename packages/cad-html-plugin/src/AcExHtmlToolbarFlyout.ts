/**
 * Sidebar tool strips for the offline HTML viewer.
 *
 * Matches cad-simple-ui-plugin:
 * - `'sticky-toolbar'`: stays open until the parent is clicked again, or
 *   another first-level button that opens a strip is clicked. Child and
 *   canvas clicks do not dismiss it. The parent button acts as a toggle.
 * - `'toolbar'`: icon strip that closes when a child button is clicked, or
 *   on canvas / outside click.
 * - `'menu'`: popover listing items (drawing layouts).
 *
 * @module AcExHtmlToolbarFlyout
 * @packageDocumentation
 */

import type { AcExHtmlLocale } from './AcExHtmlI18n'
import { acExHtmlSyncStripWrapPack } from './AcExHtmlStripWrapPack'

/** Strip ids wired by {@link setupAcExHtmlToolbarFlyouts}. */
export type AcExHtmlStripId =
  | 'measure'
  | 'review'
  | 'snap'
  | 'zoom'
  | 'settings'
  | 'locale'

/** How a nested strip is dismissed. */
export type AcExHtmlChildrenUi = 'menu' | 'toolbar' | 'sticky-toolbar'

/** Handles returned by {@link setupAcExHtmlToolbarFlyouts}. */
export interface AcExHtmlToolbarFlyoutController {
  /** Closes any open strip (and nested locale). */
  close: () => void
  /** Syncs locale option `active` state after a locale change. */
  refreshLabels: () => void
  /** Recomputes phone wrap-pack columns after resize or strip open. */
  syncLayout: () => void
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
  /** Called when strip visibility changes (e.g. resize canvas for phone bar). */
  onStripChange?: () => void
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
    sticky: false,
    btnId: 'mlcad-measure-menu-btn',
    wrapId: 'mlcad-measure-strip-wrap',
    stripId: 'mlcad-measure-strip'
  },
  {
    id: 'review',
    sticky: false,
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
    id: 'settings',
    sticky: false,
    btnId: 'mlcad-settings-btn',
    wrapId: 'mlcad-settings-strip-wrap',
    stripId: 'mlcad-settings-strip'
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
 * Only the `.mlcad-tool-btn-icon` contents are copied so phone labels stay on
 * the parent.
 *
 * @param parentId - Parent toolbar button id.
 * @param child - Clicked strip button whose icon becomes the parent icon.
 */
export function setAcExHtmlParentChildIcon(
  parentId: string,
  child: HTMLElement
): void {
  const parent = document.getElementById(parentId)
  if (!parent) return
  const childIcon =
    child.querySelector('.mlcad-tool-btn-icon') ??
    child.querySelector('svg') ??
    child.firstElementChild
  const parentIcon = parent.querySelector('.mlcad-tool-btn-icon')
  if (parentIcon && childIcon) {
    parentIcon.innerHTML = childIcon.innerHTML
    return
  }
  // Legacy fallback when icon wrappers are absent.
  parent.innerHTML = child.innerHTML
}

/**
 * Wires Measurement / Review / Snap / Zoom / Settings / Language parents.
 *
 * Parents toggle open/closed. Opening any other strip parent replaces the
 * current strip. Clicking a child tool on a dismissible strip closes it.
 * On phone, language under settings replaces the settings strip (only one
 * strip level visible). Canvas clicks dismiss only non-sticky strips.
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

  const settingsLocaleBtn = document.getElementById(
    'mlcad-settings-locale-btn'
  ) as HTMLButtonElement | null

  let openId: AcExHtmlStripId | null = null
  /** Locale opened as a nested child of settings (phone). */
  let nestedLocale = false

  const find = (id: AcExHtmlStripId) =>
    resolved.find(entry => entry.id === id)

  const syncLayout = () => {
    acExHtmlSyncStripWrapPack()
    requestAnimationFrame(() => acExHtmlSyncStripWrapPack())
  }

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

  const syncParentExpanded = () => {
    for (const entry of resolved) {
      entry.btn?.classList.toggle('active', entry.id === openId && !nestedLocale)
      entry.btn?.classList.toggle(
        'is-menu-open',
        entry.id === openId && !nestedLocale
      )
      entry.btn?.setAttribute(
        'aria-expanded',
        String(
          (entry.id === openId && !nestedLocale) ||
            (entry.id === 'locale' && nestedLocale)
        )
      )
    }
    // Keep settings parent highlighted while its strip or nested locale is open.
    const settings = find('settings')
    const settingsOpen = openId === 'settings' || nestedLocale
    settings?.btn?.classList.toggle('active', settingsOpen)
    settings?.btn?.classList.toggle('is-menu-open', settingsOpen)
    settings?.btn?.setAttribute('aria-expanded', String(settingsOpen))
    settingsLocaleBtn?.classList.toggle('active', nestedLocale)
    settingsLocaleBtn?.classList.toggle('is-menu-open', nestedLocale)
    settingsLocaleBtn?.setAttribute('aria-expanded', String(nestedLocale))
  }

  const setStripOpen = (id: AcExHtmlStripId | null) => {
    const previousId = openId
    if (previousId && previousId !== id) {
      options.onClose?.(previousId)
    }

    nestedLocale = false

    for (const entry of resolved) {
      if (entry.wrap) entry.wrap.hidden = entry.id !== id
    }

    openId = id
    syncParentExpanded()
    options.onStripChange?.()
    syncLayout()
    if (!id) return

    const opened = find(id)
    if (id === 'locale') syncLocaleSelection()
    if (opened?.strip) options.onOpen?.(id, opened.strip)
  }

  const close = () => {
    nestedLocale = false
    const previous = openId
    const previousBtn = previous ? find(previous)?.btn : null
    openId = null
    for (const entry of resolved) {
      if (entry.wrap) entry.wrap.hidden = true
    }
    syncParentExpanded()
    // Clear sticky focus chrome after closing (esp. on touch / phone).
    previousBtn?.blur()
    if (document.activeElement instanceof HTMLElement) {
      const active = document.activeElement
      if (
        active.classList.contains('mlcad-tool-btn') &&
        !active.classList.contains('active') &&
        !active.classList.contains('is-menu-open')
      ) {
        active.blur()
      }
    }
    if (previous) options.onClose?.(previous)
    options.onStripChange?.()
    syncLayout()
  }

  const toggle = (id: AcExHtmlStripId) => {
    if (openId === id && !nestedLocale) {
      close()
      return
    }
    if (id === 'settings' && nestedLocale) {
      // Closing settings while nested locale is open closes both.
      close()
      return
    }
    setStripOpen(id)
  }

  /**
   * Phone: replace settings strip with locale strip so only one level shows.
   * Selecting a locale returns to the settings strip.
   */
  const openNestedLocale = () => {
    nestedLocale = true
    const locale = find('locale')
    const settings = find('settings')
    if (settings?.wrap) settings.wrap.hidden = true
    if (locale?.wrap) locale.wrap.hidden = false
    openId = 'settings'
    syncParentExpanded()
    syncLocaleSelection()
    options.onStripChange?.()
    syncLayout()
    if (locale?.strip) options.onOpen?.('locale', locale.strip)
  }

  for (const entry of resolved) {
    entry.btn?.addEventListener('click', event => {
      event.stopPropagation()
      toggle(entry.id)
    })
  }

  settingsLocaleBtn?.addEventListener('click', event => {
    event.stopPropagation()
    if (nestedLocale) {
      // Return to settings strip (locale opener is only reachable while settings is open).
      nestedLocale = false
      const locale = find('locale')
      const settings = find('settings')
      if (locale?.wrap) locale.wrap.hidden = true
      if (settings?.wrap) settings.wrap.hidden = false
      openId = 'settings'
      syncParentExpanded()
      options.onStripChange?.()
      syncLayout()
      return
    }
    openNestedLocale()
  })

  for (const entry of resolved) {
    entry.strip
      ?.querySelectorAll<HTMLButtonElement>('button[data-action]')
      .forEach(btn => {
        btn.addEventListener('click', event => {
          event.stopPropagation()
          // Nested locale opener is handled above.
          if (btn.id === 'mlcad-settings-locale-btn') return
          options.onItemClick(btn)
          if (!entry.sticky) {
            close()
          }
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
        if (nestedLocale) {
          // After picking a language, return to the settings strip only.
          nestedLocale = false
          const localeWrap = find('locale')?.wrap
          const settingsWrap = find('settings')?.wrap
          if (localeWrap) localeWrap.hidden = true
          if (settingsWrap) settingsWrap.hidden = false
          openId = 'settings'
          syncParentExpanded()
          options.onStripChange?.()
          syncLayout()
        } else {
          close()
        }
      })
    })

  const handleDocumentClick = (event: MouseEvent) => {
    if (!openId && !nestedLocale) return
    const opened = find(openId ?? 'settings')
    if (!opened) return
    if (opened.sticky) return
    if (!(event.target instanceof Node)) return
    if (opened.wrap?.contains(event.target)) return
    if (opened.btn?.contains(event.target)) return
    if (nestedLocale) {
      const locale = find('locale')
      if (locale?.wrap?.contains(event.target)) return
      if (settingsLocaleBtn?.contains(event.target)) return
      // Settings strip is hidden while nested; ignore it for outside-click.
    }
    if (openId === 'settings' && !nestedLocale) {
      const settings = find('settings')
      if (settings?.wrap?.contains(event.target)) return
      if (settings?.btn?.contains(event.target)) return
    }
    close()
  }
  document.addEventListener('mousedown', handleDocumentClick, true)

  return {
    close,
    refreshLabels: () => {
      syncLocaleSelection()
    },
    syncLayout
  }
}
