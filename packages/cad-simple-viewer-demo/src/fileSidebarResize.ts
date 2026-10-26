import { ML_UI_COMPACT_MAX_WIDTH } from '@mlightcad/cad-simple-viewer'

const STORAGE_KEY = 'cad-example-file-sidebar-width'
const DEFAULT_WIDTH = 180
const MIN_WIDTH = 120
const MAX_WIDTH = 420

const compactMediaQuery = `(max-width: ${ML_UI_COMPACT_MAX_WIDTH}px)`

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
}

function readStoredWidth(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? clampWidth(value) : null
  } catch {
    return null
  }
}

function persistWidth(width: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(width))
  } catch {
    // Ignore storage failures in the example app.
  }
}

function isCompactLayout(): boolean {
  return window.matchMedia(compactMediaQuery).matches
}

function applyDesktopWidth(column: HTMLElement, width: number) {
  const clamped = clampWidth(width)
  column.style.width = `${clamped}px`
}

function clearDesktopWidth(column: HTMLElement) {
  column.style.width = ''
}

/**
 * Enables drag-to-resize for the predefined-files sidebar on desktop layouts.
 */
export function setupFileSidebarResize(
  column: HTMLElement,
  handle: HTMLElement
) {
  let resizePointerId: number | undefined
  let resizeStartX = 0
  let resizeStartWidth = DEFAULT_WIDTH

  const syncLayout = () => {
    if (isCompactLayout()) {
      clearDesktopWidth(column)
      return
    }
    applyDesktopWidth(column, readStoredWidth() ?? DEFAULT_WIDTH)
  }

  const finishResize = (event: PointerEvent) => {
    if (resizePointerId !== event.pointerId) return
    resizePointerId = undefined
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId)
    }
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    document.removeEventListener('pointercancel', onPointerUp)
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }

  const onPointerMove = (event: PointerEvent) => {
    if (resizePointerId !== event.pointerId) return
    event.preventDefault()
    applyDesktopWidth(column, resizeStartWidth + event.clientX - resizeStartX)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (resizePointerId !== event.pointerId) return
    const width = column.getBoundingClientRect().width
    persistWidth(width)
    finishResize(event)
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || isCompactLayout()) return
    event.preventDefault()
    resizePointerId = event.pointerId
    resizeStartX = event.clientX
    resizeStartWidth = column.getBoundingClientRect().width
    handle.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)
  }

  handle.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', syncLayout)
  syncLayout()
}
