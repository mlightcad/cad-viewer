/**
 * Match WCS text height by picking a markup/measure text label or waiting for cancel.
 *
 * @module AcExMatchTextHeight
 * @packageDocumentation
 */

import type { AcExHtmlI18n } from './AcExHtmlI18n'
import {
  AcEdEntityPickCancelChrome,
  acedIsMobileUiLayout
} from './AcExHtmlSimpleViewerUi'

/** Context for {@link acexMatchTextHeightPick}. */
export interface AcExMatchTextHeightContext {
  i18n: AcExHtmlI18n
  container: HTMLElement
  statusEl?: HTMLElement | null
  /**
   * Called after the user clicks the canvas. Return a WCS height when a text
   * entity / overlay was hit; otherwise `null` to keep waiting.
   */
  tryPickAtClientPoint: (
    clientX: number,
    clientY: number
  ) => number | null | undefined
}

function isPickChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return (
    target.closest('.ml-entity-pick-cancel') != null ||
    target.closest('.ml-ui-dialog-backdrop') != null ||
    target.closest('.ml-ui-dialog') != null
  )
}

/**
 * Enters a pick loop with an optional mobile cancel button under the status bar.
 * Escape always cancels; clicks on cancel chrome / dialogs are ignored.
 */
export function acexMatchTextHeightPick(
  ctx: AcExMatchTextHeightContext
): Promise<number | null> {
  return new Promise(resolve => {
    const previousStatus = ctx.statusEl?.textContent ?? ''
    if (ctx.statusEl) {
      ctx.statusEl.textContent = ctx.i18n.t('textHeight.matchPrompt')
      ctx.statusEl.hidden = false
    }

    let settled = false
    let cancelChrome: AcEdEntityPickCancelChrome | null = null

    const finish = (value: number | null) => {
      if (settled) return
      settled = true
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKeyDown, true)
      cancelChrome?.dispose()
      if (ctx.statusEl) {
        ctx.statusEl.textContent = previousStatus
        if (!previousStatus.trim()) ctx.statusEl.hidden = true
      }
      resolve(value)
    }

    const onClick = (event: MouseEvent) => {
      if (settled) return
      if (isPickChromeTarget(event.target)) return
      const height = ctx.tryPickAtClientPoint(event.clientX, event.clientY)
      if (height != null && height > 0) {
        event.preventDefault()
        event.stopPropagation()
        finish(height)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (settled) return
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      finish(null)
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKeyDown, true)

    if (acedIsMobileUiLayout()) {
      const statusBottom = ctx.statusEl?.getBoundingClientRect().bottom
      const rootTop = ctx.container.getBoundingClientRect().top
      const topOffsetPx =
        statusBottom != null ? Math.max(48, statusBottom - rootTop + 8) : 48
      cancelChrome = new AcEdEntityPickCancelChrome({
        container: ctx.container,
        label: ctx.i18n.t('entityPick.cancel'),
        topOffsetPx,
        onCancel: () => finish(null)
      })
      cancelChrome.show()
    }
  })
}
