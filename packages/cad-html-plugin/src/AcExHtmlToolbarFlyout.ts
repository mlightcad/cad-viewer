/**
 * Sidebar tool strips for Measurement / Review in the offline HTML viewer.
 * Same interaction model as the Settings strip (icon toolbar beside the main nav).
 *
 * @module AcExHtmlToolbarFlyout
 * @packageDocumentation
 */

/** Handles returned by {@link setupAcExHtmlToolbarFlyouts}. */
export interface AcExHtmlToolbarFlyoutController {
  /** Closes any open Measurement / Review strip. */
  close: () => void
  /** No-op kept for callers that refresh open-panel labels. */
  refreshLabels: () => void
}

/**
 * Options for wiring Measurement / Review parent buttons to their tool strips.
 */
export interface AcExHtmlToolbarFlyoutOptions {
  /**
   * Invoked when a strip item is clicked (same contract as top-level
   * `data-action` toolbar buttons).
   */
  onItemClick: (button: HTMLButtonElement) => void
  /** Close other sidebar panels (settings / layers) before opening a strip. */
  closeOtherPanels?: () => void
  /**
   * Called after a strip opens so callers can sync active/toggle states.
   */
  onOpen?: (menuId: 'measure' | 'review', menuRoot: HTMLElement) => void
}

type AcExToolStripId = 'measure' | 'review'

/**
 * Wires `#mlcad-measure-menu-btn` / `#mlcad-markup-menu-btn` to toggle
 * `#mlcad-measure-strip-wrap` / `#mlcad-markup-strip-wrap` like Settings.
 */
export function setupAcExHtmlToolbarFlyouts(
  options: AcExHtmlToolbarFlyoutOptions
): AcExHtmlToolbarFlyoutController {
  const measureBtn = document.getElementById(
    'mlcad-measure-menu-btn'
  ) as HTMLButtonElement | null
  const reviewBtn = document.getElementById(
    'mlcad-markup-menu-btn'
  ) as HTMLButtonElement | null
  const measureWrap = document.getElementById('mlcad-measure-strip-wrap')
  const reviewWrap = document.getElementById('mlcad-markup-strip-wrap')
  const measureStrip = document.getElementById('mlcad-measure-strip')
  const reviewStrip = document.getElementById('mlcad-markup-strip')

  let openId: AcExToolStripId | null = null

  const setStripOpen = (id: AcExToolStripId | null) => {
    const measureOpen = id === 'measure'
    const reviewOpen = id === 'review'
    if (measureWrap) measureWrap.hidden = !measureOpen
    if (reviewWrap) reviewWrap.hidden = !reviewOpen
    measureBtn?.classList.toggle('active', measureOpen)
    measureBtn?.classList.toggle('is-menu-open', measureOpen)
    measureBtn?.setAttribute('aria-expanded', String(measureOpen))
    reviewBtn?.classList.toggle('active', reviewOpen)
    reviewBtn?.classList.toggle('is-menu-open', reviewOpen)
    reviewBtn?.setAttribute('aria-expanded', String(reviewOpen))
    openId = id
    if (id === 'measure' && measureStrip) {
      options.onOpen?.('measure', measureStrip)
    } else if (id === 'review' && reviewStrip) {
      options.onOpen?.('review', reviewStrip)
    }
  }

  const close = () => setStripOpen(null)

  const toggle = (id: AcExToolStripId) => {
    if (openId === id) {
      close()
      return
    }
    options.closeOtherPanels?.()
    setStripOpen(id)
  }

  measureBtn?.addEventListener('click', event => {
    event.stopPropagation()
    toggle('measure')
  })
  reviewBtn?.addEventListener('click', event => {
    event.stopPropagation()
    toggle('review')
  })

  const bindStripClicks = (strip: HTMLElement | null) => {
    strip
      ?.querySelectorAll<HTMLButtonElement>('button[data-action]')
      .forEach(btn => {
        btn.addEventListener('click', event => {
          event.stopPropagation()
          options.onItemClick(btn)
        })
      })
  }
  bindStripClicks(measureStrip)
  bindStripClicks(reviewStrip)

  // Strips stay open until the parent button is clicked again (or another
  // parent strip replaces this one). Canvas clicks must not dismiss them.

  return {
    close,
    refreshLabels: () => {
      // Strip buttons use data-i18n-key; global i18n refresh covers them.
    }
  }
}
