/**
 * Shortcut toolbar for the offline HTML viewer (undo / redo / erase + selection extensions).
 *
 * @module AcExHtmlShortCutToolbar
 * @packageDocumentation
 */

import type { AcExHtmlI18n } from './AcExHtmlI18n'
import {
  AcUiShortCutToolbar,
  type AcUiShortCutToolbarActionState,
  type AcUiSimpleToolbarItem
} from './AcExHtmlSimpleViewerUi'
import {
  ACEX_HTML_TOP_CHROME_GAP_PX,
  ACEX_HTML_TOP_CHROME_NEAR_TOP_PX,
  acexHtmlTopChromeBottomOffset,
  getAcExHtmlTopChrome
} from './AcExHtmlTopChrome'

/** Dependencies for {@link setupAcExHtmlShortCutToolbar}. */
export interface AcExHtmlShortCutToolbarContext {
  i18n: AcExHtmlI18n
  /** Host, typically `#mlcad-root`. */
  container: HTMLElement
  /**
   * Status / message bar (optional). Top offset is derived from `#mlcad-top-chrome`
   * when present so expiry and the message bar share one measured row.
   */
  statusEl?: HTMLElement | null
  actions: {
    undo: () => void
    redo: () => void
    erase: () => void
  }
  /** Optional enabled-state provider for undo / redo / erase. */
  getActionState?: () => AcUiShortCutToolbarActionState
}

/** Controller returned by {@link setupAcExHtmlShortCutToolbar}. */
export interface AcExHtmlShortCutToolbarController {
  toolbar: AcUiShortCutToolbar
  setExtensionItems: (items: AcUiSimpleToolbarItem[]) => void
  syncTopOffset: () => void
  syncActionState: () => void
  dispose: () => void
}

function computeTopOffset(container: HTMLElement): number {
  return acexHtmlTopChromeBottomOffset(container, {
    gapPx: ACEX_HTML_TOP_CHROME_GAP_PX,
    nearTopPx: ACEX_HTML_TOP_CHROME_NEAR_TOP_PX
  })
}

/**
 * Creates a force-visible shortcut toolbar aligned under the HTML top chrome.
 */
export function setupAcExHtmlShortCutToolbar(
  ctx: AcExHtmlShortCutToolbarContext
): AcExHtmlShortCutToolbarController {
  const toolbar = new AcUiShortCutToolbar({
    container: ctx.container,
    forceVisible: true,
    topOffsetPx: computeTopOffset(ctx.container),
    actions: ctx.actions,
    getActionState: ctx.getActionState,
    labels: {
      more: ctx.i18n.t('shortCutToolbar.more'),
      undo: ctx.i18n.t('shortCutToolbar.undo'),
      redo: ctx.i18n.t('shortCutToolbar.redo'),
      erase: ctx.i18n.t('shortCutToolbar.erase'),
      collapse: ctx.i18n.t('shortCutToolbar.collapse'),
      expand: ctx.i18n.t('shortCutToolbar.expand')
    }
  })

  const syncTopOffset = () => {
    toolbar.setTopOffset(computeTopOffset(ctx.container))
  }

  const chrome =
    getAcExHtmlTopChrome(ctx.container) ??
    (ctx.statusEl?.closest('#mlcad-top-chrome') as HTMLElement | null) ??
    ctx.statusEl ??
    null
  const observer = chrome != null ? new MutationObserver(() => syncTopOffset()) : null
  if (chrome && observer) {
    observer.observe(chrome, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    })
  }
  window.addEventListener('resize', syncTopOffset)

  return {
    toolbar,
    setExtensionItems: items => toolbar.setExtensionItems(items),
    syncTopOffset,
    syncActionState: () => toolbar.syncActionState(),
    dispose: () => {
      observer?.disconnect()
      window.removeEventListener('resize', syncTopOffset)
      toolbar.dispose()
    }
  }
}
