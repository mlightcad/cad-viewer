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

/** Dependencies for {@link setupAcExHtmlShortCutToolbar}. */
export interface AcExHtmlShortCutToolbarContext {
  i18n: AcExHtmlI18n
  /** Host, typically `#mlcad-root`. */
  container: HTMLElement
  /** Status / message bar used to offset the toolbar below it. */
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

function computeTopOffset(statusEl: HTMLElement | null | undefined): number {
  const gap = 8
  const nearTop = 12
  if (!statusEl || statusEl.hidden || !statusEl.textContent?.trim()) {
    return nearTop
  }
  const rect = statusEl.getBoundingClientRect()
  const root = statusEl.offsetParent as HTMLElement | null
  const rootTop = root?.getBoundingClientRect().top ?? 0
  return Math.max(nearTop, rect.bottom - rootTop + gap)
}

/**
 * Creates a force-visible shortcut toolbar aligned under the HTML status bar.
 */
export function setupAcExHtmlShortCutToolbar(
  ctx: AcExHtmlShortCutToolbarContext
): AcExHtmlShortCutToolbarController {
  const toolbar = new AcUiShortCutToolbar({
    container: ctx.container,
    forceVisible: true,
    topOffsetPx: computeTopOffset(ctx.statusEl),
    actions: ctx.actions,
    getActionState: ctx.getActionState,
    labels: {
      more: ctx.i18n.t('shortCutToolbar.more'),
      undo: ctx.i18n.t('shortCutToolbar.undo'),
      redo: ctx.i18n.t('shortCutToolbar.redo'),
      erase: ctx.i18n.t('shortCutToolbar.erase')
    }
  })

  const syncTopOffset = () => {
    toolbar.setTopOffset(computeTopOffset(ctx.statusEl))
  }

  const observer =
    ctx.statusEl != null
      ? new MutationObserver(() => syncTopOffset())
      : null
  if (ctx.statusEl && observer) {
    observer.observe(ctx.statusEl, {
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
