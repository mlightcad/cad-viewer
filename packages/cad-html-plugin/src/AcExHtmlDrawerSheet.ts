/**
 * Shared phone-sheet chrome for HTML layer / review / measurement drawers:
 * full-width sheet above the toolbar, grabber to resize height, close arrow.
 *
 * @module AcExHtmlDrawerSheet
 * @packageDocumentation
 */

import { ML_UI_MOBILE_MAX_WIDTH } from './AcExHtmlShell'

const MIN_HEIGHT = 160
const DEFAULT_HEIGHT_VH = 0.42

/** Wires grabbers and keeps phone sheets above the toolbar / tool strips. */
export interface AcExHtmlDrawerSheetController {
  /** Recompute `--mlcad-phone-drawer-bottom` from visible chrome. */
  syncInset: () => void
  /**
   * On phone, moves the drawer onto the sidebar (so closing a strip wrap does
   * not hide it) and dismisses open tool strips.
   */
  preparePhoneOpen: (drawer: HTMLElement) => void
}

/** Whether the offline HTML chrome is using the phone breakpoint. */
export function acExHtmlIsPhoneLayout(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.(`(max-width: ${ML_UI_MOBILE_MAX_WIDTH}px)`).matches ===
      true
  )
}

/**
 * Enables height-resize on drawer grabbers and pins sheets above phone chrome.
 */
export function setupAcExHtmlDrawerSheets(options?: {
  /** Closes open measure / review / zoom / settings strips. */
  closeStrips?: () => void
}): AcExHtmlDrawerSheetController {
  const drawers = [
    document.getElementById('mlcad-layer-drawer'),
    document.getElementById('mlcad-review-drawer'),
    document.getElementById('mlcad-measure-drawer')
  ].filter((el): el is HTMLElement => el != null)

  const homeParent = new WeakMap<HTMLElement, HTMLElement>()
  for (const drawer of drawers) {
    if (drawer.parentElement) homeParent.set(drawer, drawer.parentElement)
    bindDrawerResize(drawer)
  }

  const restoreIfDesktop = () => {
    if (acExHtmlIsPhoneLayout()) return
    const sidebar = document.getElementById('mlcad-sidebar')
    for (const drawer of drawers) {
      drawer.style.height = ''
      drawer.style.maxHeight = ''
      const home = homeParent.get(drawer)
      if (!home) continue
      // Phone open parks the drawer on the sidebar and closes strip wraps.
      // Reparenting an open drawer into a hidden wrap would hide it while it
      // stays logically open — keep it on the sidebar until the wrap is shown
      // or the drawer is closed.
      const trappedInHiddenWrap = home.hidden && !drawer.hidden
      if (trappedInHiddenWrap) {
        if (sidebar && drawer.parentElement !== sidebar) {
          sidebar.appendChild(drawer)
        }
        continue
      }
      if (drawer.parentElement !== home) {
        home.appendChild(drawer)
      }
    }
  }

  const syncInset = () => {
    const toolbar = document.getElementById('mlcad-toolbar')
    let inset = toolbar?.offsetHeight ?? 56
    const wraps = document.querySelectorAll<HTMLElement>(
      '#mlcad-measure-strip-wrap, #mlcad-markup-strip-wrap, #mlcad-snap-strip-wrap, #mlcad-zoom-strip-wrap, #mlcad-settings-strip-wrap, #mlcad-locale-strip-wrap'
    )
    wraps.forEach(wrap => {
      if (wrap.hidden) return
      inset += wrap.offsetHeight
    })
    const session = document.getElementById('mlcad-command-session')
    if (session && !session.hidden && acExHtmlIsPhoneLayout()) {
      inset = Math.max(inset, session.offsetHeight)
    }
    document.documentElement.style.setProperty(
      '--mlcad-phone-drawer-bottom',
      `${inset}px`
    )
  }

  const preparePhoneOpen = (drawer: HTMLElement) => {
    if (!acExHtmlIsPhoneLayout()) return
    const sidebar = document.getElementById('mlcad-sidebar')
    if (sidebar && drawer.parentElement !== sidebar) {
      sidebar.appendChild(drawer)
    }
    options?.closeStrips?.()
    syncInset()
  }

  syncInset()
  window.addEventListener('resize', () => {
    restoreIfDesktop()
    syncInset()
  })

  return { syncInset, preparePhoneOpen }
}

function bindDrawerResize(drawer: HTMLElement) {
  const grabber = drawer.querySelector('.mlcad-drawer-grabber')
  if (!(grabber instanceof HTMLElement)) return

  let pointerId: number | undefined
  let startY = 0
  let startHeight = 0

  const onMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return
    event.preventDefault()
    const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight * 0.75)
    const next = Math.max(
      MIN_HEIGHT,
      Math.min(maxHeight, startHeight + (startY - event.clientY))
    )
    drawer.style.height = `${next}px`
    drawer.style.maxHeight = 'none'
  }

  const onUp = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return
    pointerId = undefined
    if (grabber.hasPointerCapture(event.pointerId)) {
      grabber.releasePointerCapture(event.pointerId)
    }
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    document.removeEventListener('pointercancel', onUp)
  }

  grabber.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    event.preventDefault()
    pointerId = event.pointerId
    startY = event.clientY
    startHeight =
      drawer.getBoundingClientRect().height ||
      window.innerHeight * DEFAULT_HEIGHT_VH
    grabber.setPointerCapture(event.pointerId)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  })
}
