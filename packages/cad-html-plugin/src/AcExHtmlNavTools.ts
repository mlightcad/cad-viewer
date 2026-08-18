import type { AcExHtmlI18n } from './AcExHtmlI18n'
import type { AcExExtents } from './AcExSnapshotTypes'

/** Idle navigation tools on the first-level HTML toolbar. */
export type AcExHtmlNavMode = 'select' | 'pan' | 'zoom-window'

/** Handles returned by {@link setupAcExHtmlNavTools}. */
export interface AcExHtmlNavToolsController {
  /** Current idle navigation mode. */
  getMode: () => AcExHtmlNavMode
  /**
   * Switches navigation mode, cancels drawing tools, and updates button state.
   *
   * @param mode - Target navigation tool.
   */
  setMode: (mode: AcExHtmlNavMode) => void
  /** Whether left-button pan should be enabled. */
  isPanEnabled: () => boolean
  /**
   * Handles canvas left-click while zoom-window is active.
   *
   * @returns Whether the event was consumed (caller should stop pan).
   */
  handlePointerDown: (clientX: number, clientY: number) => boolean
  /** Updates the zoom-window rubber band while the pointer moves. */
  handlePointerMove: (clientX: number, clientY: number) => void
  /** Cancels an in-progress zoom window (Escape). */
  cancelZoomWindow: () => void
  /** Re-syncs button `active` after measure/markup start or stop. */
  syncButtons: () => void
  /** Reapplies i18n titles. */
  refreshLabels: () => void
}

/** Dependencies for {@link setupAcExHtmlNavTools}. */
export interface AcExHtmlNavToolsOptions {
  /** Overlay host (usually `#mlcad-root`). */
  root: HTMLElement
  i18n: AcExHtmlI18n
  /** Converts a client point to world XY. */
  screenToWcs: (clientX: number, clientY: number) => { x: number; y: number }
  /** Zooms the camera to a world-space box. */
  zoomToExtents: (extents: AcExExtents) => void
  /** Exits measurement / review drawing and clears their tool-button selection. */
  exitDrawingTools: () => void
  /** True while a measure or markup drawing tool is active. */
  isDrawingActive: () => boolean
  /** Called after the navigation mode changes (orbit-control wiring). */
  onModeChange?: (mode: AcExHtmlNavMode) => void
  /** Idle status text restored after zoom-window completes or is cancelled. */
  getReadyStatus?: () => string
  /** Status bar element for zoom-window hints. */
  statusEl?: HTMLElement | null
}

const NAV_MODE_BUTTONS: Array<{ mode: AcExHtmlNavMode; action: string }> = [
  { mode: 'select', action: 'select' },
  { mode: 'pan', action: 'pan' }
]

/**
 * Wires Select / Pan / Zoom Window as exclusive idle tools.
 *
 * Default mode is pan so exported HTML keeps left-drag navigation. Activating
 * any of these tools exits measurement and review drawing modes.
 */
export function setupAcExHtmlNavTools(
  options: AcExHtmlNavToolsOptions
): AcExHtmlNavToolsController {
  let mode: AcExHtmlNavMode = 'pan'
  let idleMode: AcExHtmlNavMode = 'pan'
  let zoomFirst: { clientX: number; clientY: number; x: number; y: number } | null =
    null

  const rubber = document.createElement('div')
  rubber.id = 'mlcad-zoom-window-rect'
  rubber.hidden = true
  options.root.appendChild(rubber)

  const hideRubber = () => {
    rubber.hidden = true
  }

  const updateRubber = (clientX: number, clientY: number) => {
    if (!zoomFirst) {
      hideRubber()
      return
    }
    const left = Math.min(zoomFirst.clientX, clientX)
    const top = Math.min(zoomFirst.clientY, clientY)
    const width = Math.abs(clientX - zoomFirst.clientX)
    const height = Math.abs(clientY - zoomFirst.clientY)
    rubber.style.left = `${left}px`
    rubber.style.top = `${top}px`
    rubber.style.width = `${width}px`
    rubber.style.height = `${height}px`
    rubber.hidden = false
  }

  const setStatus = (text: string) => {
    if (options.statusEl) options.statusEl.textContent = text
  }

  const syncButtons = () => {
    const drawing = options.isDrawingActive()
    NAV_MODE_BUTTONS.forEach(({ mode: navMode, action }) => {
      const pressed = !drawing && mode === navMode
      document.querySelectorAll(`[data-action="${action}"]`).forEach(btn => {
        btn.classList.toggle('active', pressed)
        btn.setAttribute('aria-pressed', String(pressed))
      })
    })
    const zoomWindowPressed = !drawing && mode === 'zoom-window'
    document.querySelectorAll('[data-action="zoom-window"]').forEach(btn => {
      btn.classList.toggle('active', zoomWindowPressed)
      btn.setAttribute('aria-pressed', String(zoomWindowPressed))
    })
  }

  const resetZoomWindow = () => {
    zoomFirst = null
    hideRubber()
  }

  const finishToIdle = () => {
    resetZoomWindow()
    mode = idleMode === 'zoom-window' ? 'pan' : idleMode
    syncButtons()
    options.onModeChange?.(mode)
    // Drawing tools own the status bar while they are active.
    if (!options.isDrawingActive()) {
      setStatus(options.getReadyStatus?.() ?? '')
    }
  }

  const setMode = (next: AcExHtmlNavMode) => {
    options.exitDrawingTools()
    resetZoomWindow()
    mode = next
    if (next !== 'zoom-window') {
      idleMode = next
    }
    syncButtons()
    options.onModeChange?.(mode)
    if (next === 'zoom-window') {
      setStatus(options.i18n.t('status.zoomWindowHint'))
    }
  }

  const handlePointerDown = (clientX: number, clientY: number): boolean => {
    if (mode !== 'zoom-window' || options.isDrawingActive()) return false
    const wcs = options.screenToWcs(clientX, clientY)
    if (!zoomFirst) {
      zoomFirst = { clientX, clientY, x: wcs.x, y: wcs.y }
      updateRubber(clientX, clientY)
      return true
    }
    const minX = Math.min(zoomFirst.x, wcs.x)
    const maxX = Math.max(zoomFirst.x, wcs.x)
    const minY = Math.min(zoomFirst.y, wcs.y)
    const maxY = Math.max(zoomFirst.y, wcs.y)
    if (maxX - minX > 1e-8 && maxY - minY > 1e-8) {
      options.zoomToExtents({ minX, minY, maxX, maxY })
    }
    finishToIdle()
    return true
  }

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (mode !== 'zoom-window' || !zoomFirst) return
    updateRubber(clientX, clientY)
  }

  const cancelZoomWindow = () => {
    if (mode !== 'zoom-window') return
    finishToIdle()
  }

  syncButtons()

  return {
    getMode: () => mode,
    setMode,
    isPanEnabled: () => mode === 'pan' && !options.isDrawingActive(),
    handlePointerDown,
    handlePointerMove,
    cancelZoomWindow,
    syncButtons,
    refreshLabels: () => {
      syncButtons()
    }
  }
}
