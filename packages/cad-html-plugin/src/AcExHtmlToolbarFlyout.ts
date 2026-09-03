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
 * Snap and language live under Settings as nested strips (same replace
 * pattern on phone/pad/desktop).
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

/** Nested strip opened from the settings strip. */
type AcExHtmlNestedSettingsStrip = 'snap' | 'locale'

/** How a nested strip is dismissed. */
export type AcExHtmlChildrenUi = 'menu' | 'toolbar' | 'sticky-toolbar'

/** Handles returned by {@link setupAcExHtmlToolbarFlyouts}. */
export interface AcExHtmlToolbarFlyoutController {
  /** Closes any open strip (and nested settings children). */
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
  /**
   * Top-level toolbar parent id. Nested-only strips (`snap`, `locale`) omit
   * this and are opened from buttons inside the settings strip.
   */
  btnId?: string
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
    wrapId: 'mlcad-locale-strip-wrap',
    stripId: 'mlcad-locale-strip'
  }
]

const NESTED_OPENER_IDS: Record<AcExHtmlNestedSettingsStrip, string> = {
  snap: 'mlcad-settings-snap-btn',
  locale: 'mlcad-settings-locale-btn'
}

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
 * Wires Measurement / Review / Zoom / Settings parents, plus nested Snap and
 * Language under Settings.
 *
 * Parents toggle open/closed. Opening any other strip parent replaces the
 * current strip. Clicking a child tool on a dismissible strip closes it.
 * Nested settings children replace the settings strip (one level visible).
 * Canvas clicks dismiss only non-sticky strips.
 */
export function setupAcExHtmlToolbarFlyouts(
  options: AcExHtmlToolbarFlyoutOptions
): AcExHtmlToolbarFlyoutController {
  const resolved = STRIPS.map(config => ({
    ...config,
    btn: config.btnId
      ? (document.getElementById(config.btnId) as HTMLButtonElement | null)
      : null,
    wrap: document.getElementById(config.wrapId),
    strip: document.getElementById(config.stripId)
  })).filter(entry => {
    if (!entry.wrap) return false
    // Nested-only strips: wrap is enough (opened from settings).
    if (entry.id === 'snap' || entry.id === 'locale') return true
    return Boolean(entry.btn)
  })

  const settingsSnapBtn = document.getElementById(
    NESTED_OPENER_IDS.snap
  ) as HTMLButtonElement | null
  const settingsLocaleBtn = document.getElementById(
    NESTED_OPENER_IDS.locale
  ) as HTMLButtonElement | null

  let openId: AcExHtmlStripId | null = null
  /** Nested strip opened from settings (snap / language). */
  let nestedId: AcExHtmlNestedSettingsStrip | null = null

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
      if (!entry.btn) continue
      const isOpen = entry.id === openId && !nestedId
      entry.btn.classList.toggle('active', isOpen)
      entry.btn.classList.toggle('is-menu-open', isOpen)
      entry.btn.setAttribute('aria-expanded', String(isOpen))
    }
    // Keep settings parent highlighted while its strip or a nested child is open.
    const settings = find('settings')
    const settingsOpen = openId === 'settings' || nestedId != null
    settings?.btn?.classList.toggle('active', settingsOpen)
    settings?.btn?.classList.toggle('is-menu-open', settingsOpen)
    settings?.btn?.setAttribute('aria-expanded', String(settingsOpen))

    settingsSnapBtn?.classList.toggle('active', nestedId === 'snap')
    settingsSnapBtn?.classList.toggle('is-menu-open', nestedId === 'snap')
    settingsSnapBtn?.setAttribute(
      'aria-expanded',
      String(nestedId === 'snap')
    )

    settingsLocaleBtn?.classList.toggle('active', nestedId === 'locale')
    settingsLocaleBtn?.classList.toggle('is-menu-open', nestedId === 'locale')
    settingsLocaleBtn?.setAttribute(
      'aria-expanded',
      String(nestedId === 'locale')
    )
  }

  const setStripOpen = (id: AcExHtmlStripId | null) => {
    const previousId = openId
    if (previousId && previousId !== id) {
      options.onClose?.(previousId)
    }

    nestedId = null

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
    nestedId = null
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
    if (openId === id && !nestedId) {
      close()
      return
    }
    if (id === 'settings' && nestedId) {
      // Closing settings while a nested child is open closes both.
      close()
      return
    }
    setStripOpen(id)
  }

  /**
   * Replace the settings strip with a nested child strip so only one level
   * shows. Selecting a leaf (locale) or toggling the opener returns to settings.
   */
  const openNestedFromSettings = (id: AcExHtmlNestedSettingsStrip) => {
    nestedId = id
    const nested = find(id)
    const settings = find('settings')
    if (settings?.wrap) settings.wrap.hidden = true
    if (nested?.wrap) nested.wrap.hidden = false
    // Hide other nested siblings.
    for (const sibling of ['snap', 'locale'] as const) {
      if (sibling === id) continue
      const wrap = find(sibling)?.wrap
      if (wrap) wrap.hidden = true
    }
    openId = 'settings'
    syncParentExpanded()
    if (id === 'locale') syncLocaleSelection()
    options.onStripChange?.()
    syncLayout()
    if (nested?.strip) options.onOpen?.(id, nested.strip)
  }

  const returnToSettingsFromNested = () => {
    nestedId = null
    const settings = find('settings')
    for (const id of ['snap', 'locale'] as const) {
      const wrap = find(id)?.wrap
      if (wrap) wrap.hidden = true
    }
    if (settings?.wrap) settings.wrap.hidden = false
    openId = 'settings'
    syncParentExpanded()
    options.onStripChange?.()
    syncLayout()
  }

  const wireNestedOpener = (
    btn: HTMLButtonElement | null,
    id: AcExHtmlNestedSettingsStrip
  ) => {
    btn?.addEventListener('click', event => {
      event.stopPropagation()
      if (nestedId === id) {
        returnToSettingsFromNested()
        return
      }
      openNestedFromSettings(id)
    })
  }

  for (const entry of resolved) {
    // Nested-only strips have no top-level parent button.
    if (!entry.btn || entry.id === 'snap' || entry.id === 'locale') continue
    entry.btn.addEventListener('click', event => {
      event.stopPropagation()
      toggle(entry.id)
    })
  }

  wireNestedOpener(settingsSnapBtn, 'snap')
  wireNestedOpener(settingsLocaleBtn, 'locale')

  for (const entry of resolved) {
    entry.strip
      ?.querySelectorAll<HTMLButtonElement>('button[data-action]')
      .forEach(btn => {
        btn.addEventListener('click', event => {
          event.stopPropagation()
          // Nested openers are handled above.
          if (
            btn.id === NESTED_OPENER_IDS.snap ||
            btn.id === NESTED_OPENER_IDS.locale
          ) {
            return
          }
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
        if (nestedId === 'locale') {
          // After picking a language, return to the settings strip only.
          returnToSettingsFromNested()
        } else {
          close()
        }
      })
    })

  const handleDocumentClick = (event: MouseEvent) => {
    if (!openId && !nestedId) return
    if (!(event.target instanceof Node)) return

    // Nested sticky snap: canvas clicks do not dismiss.
    if (nestedId === 'snap') {
      const snap = find('snap')
      if (snap?.wrap?.contains(event.target)) return
      if (settingsSnapBtn?.contains(event.target)) return
      return
    }

    if (nestedId === 'locale') {
      const locale = find('locale')
      if (locale?.wrap?.contains(event.target)) return
      if (settingsLocaleBtn?.contains(event.target)) return
      close()
      return
    }

    const opened = find(openId ?? 'settings')
    if (!opened) return
    if (opened.sticky) return
    if (opened.wrap?.contains(event.target)) return
    if (opened.btn?.contains(event.target)) return
    if (openId === 'settings') {
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
