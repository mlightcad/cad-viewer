import { eventBus } from '@mlightcad/cad-simple-viewer'

import type { AcExToolbarPlacement } from '../config/types'
import type { AcExLayerUiController } from '../command/AcApLayerUiCmd'
import { AcExLayerListView, type AcExLayerListViewOptions } from './AcExLayerListView'
import { ensureUiStyles } from './styles'

/** Minimum popover height on desktop (px); also used when the toolbar is shorter. */
const LAYER_POPOVER_MIN_HEIGHT = 320
/** Absolute minimum popover height (px). */
const LAYER_POPOVER_ABSOLUTE_MIN_HEIGHT = 120
/** Gap between anchor button and popover (px). */
const LAYER_POPOVER_GAP = 4
/** Viewport edge inset when clamping position (px). */
const LAYER_POPOVER_VIEWPORT_INSET = 8
/** Host width at or below which compact (mobile) layout is used (px). */
const LAYER_POPOVER_COMPACT_BREAKPOINT = 640
/** Preferred height ratio for compact layout relative to the host height. */
const LAYER_POPOVER_COMPACT_HEIGHT_RATIO = 0.55
/** Maximum height for compact layout (px). */
const LAYER_POPOVER_COMPACT_MAX_HEIGHT = 420

/** Stable id for the popover title element (used by aria-labelledby). */
const LAYER_MANAGER_TITLE_ID = 'ml-ex-ui-layer-manager-title'

/** Constructor options for {@link AcExLayerManager}. */
export interface AcExLayerManagerOptions
  extends Omit<AcExLayerListViewOptions, 'showHeader'> {
  /** Toolbar placement used to position the popover relative to the anchor. */
  toolbarPlacement?: AcExToolbarPlacement
  /**
   * Resolves the layer toolbar button, expanding a collapsed toolbar when needed.
   * Falls back to querying the host when not provided.
   */
  resolveLayerAnchor?: () => HTMLElement | undefined
}

/**
 * Layer list popover anchored to the toolbar layer button.
 *
 * Opens on layer button click and closes on outside interaction (canvas, other UI).
 */
export class AcExLayerManager implements AcExLayerUiController {
  /** Root popover element. */
  private root: HTMLDivElement
  /** Reusable layer table content. */
  private readonly layerList: AcExLayerListView
  /** Viewer host reference. */
  private readonly host: HTMLElement
  /** Toolbar placement for popover positioning. */
  private toolbarPlacement: AcExToolbarPlacement
  /** Button element the popover is anchored to, when visible. */
  private anchor?: HTMLElement
  /** Element focused before the popover opened. */
  private previousFocus?: HTMLElement
  /** Re-positions the popover when the viewer host is resized. */
  private readonly resizeObserver: ResizeObserver
  /** Resolves the layer toolbar button when invoked from the `layer` command. */
  private readonly resolveLayerAnchor?: () => HTMLElement | undefined

  /** Hides the popover when the global `close-layer-manager` event fires. */
  private handleCloseLayerManager = () => {
    this.hide()
  }

  /** Closes the popover when the user interacts outside it and the anchor. */
  private handleDocumentPointerDown = (event: PointerEvent) => {
    if (!this.visible) return
    if (!(event.target instanceof Node)) return
    if (this.root.contains(event.target)) return
    if (this.anchor?.contains(event.target)) return
    if (
      event.target instanceof Element &&
      event.target.closest('.ml-ex-ui-color-dialog-backdrop')
    ) {
      return
    }
    this.hide()
  }

  /** Closes the popover when the user presses Escape. */
  private handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (!this.visible || event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    this.hide()
  }

  /**
   * @param options - Editor, i18n, host, and placement options.
   */
  constructor(options: AcExLayerManagerOptions) {
    this.host = options.host
    this.toolbarPlacement = options.toolbarPlacement ?? 'right'
    this.resolveLayerAnchor = options.resolveLayerAnchor
    ensureUiStyles()

    this.layerList = new AcExLayerListView({
      editor: options.editor,
      i18n: options.i18n,
      host: options.host,
      showHeader: true
    })

    this.root = document.createElement('div')
    this.root.className = 'ml-ex-ui-layer-manager is-hidden'
    this.root.setAttribute('role', 'dialog')
    this.root.setAttribute('aria-modal', 'false')
    this.root.setAttribute('aria-labelledby', LAYER_MANAGER_TITLE_ID)

    const titleEl = this.layerList.element.querySelector(
      '.ml-ex-ui-layer-manager-header span'
    )
    if (titleEl) {
      titleEl.id = LAYER_MANAGER_TITLE_ID
    }

    this.root.appendChild(this.layerList.element)
    this.bindPopoverPointerGuard(this.layerList.element)

    if (getComputedStyle(this.host).position === 'static') {
      this.host.style.position = 'relative'
    }

    this.host.appendChild(this.root)
    eventBus.on('close-layer-manager', this.handleCloseLayerManager)

    this.resizeObserver = new ResizeObserver(() => {
      if (this.visible && this.anchor) {
        this.positionNear(this.anchor)
      }
    })
    this.resizeObserver.observe(this.host)
  }

  /**
   * Shows the popover anchored to the given toolbar button.
   *
   * @param anchor - Layer toolbar button used for positioning.
   */
  show(anchor: HTMLElement) {
    this.previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined
    this.anchor = anchor
    this.root.classList.remove('is-hidden')
    this.positionNear(anchor)
    document.addEventListener(
      'pointerdown',
      this.handleDocumentPointerDown,
      true
    )
    document.addEventListener('keydown', this.handleDocumentKeyDown, true)
    this.focusInitialControl()
  }

  /** Hides the popover without destroying it. */
  hide() {
    this.root.classList.add('is-hidden')
    document.removeEventListener(
      'pointerdown',
      this.handleDocumentPointerDown,
      true
    )
    document.removeEventListener('keydown', this.handleDocumentKeyDown, true)
    const restoreFocus = this.anchor ?? this.previousFocus
    this.anchor = undefined
    this.previousFocus = undefined
    if (restoreFocus?.isConnected) {
      restoreFocus.focus()
    }
  }

  /**
   * Shows the popover if hidden, otherwise hides it.
   *
   * @param anchor - Layer toolbar button used for positioning.
   */
  toggle(anchor: HTMLElement) {
    if (this.visible && this.anchor === anchor) {
      this.hide()
      return
    }
    this.show(anchor)
  }

  /**
   * Toggles the popover using the layer toolbar button when available.
   *
   * Used by the `layer` CAD command when invoked without a direct anchor.
   */
  toggleFromCommand() {
    const anchor = this.findLayerButtonAnchor()
    if (anchor) {
      this.toggle(anchor)
      return
    }
    if (this.visible) {
      this.hide()
    }
  }

  /** Whether the popover is currently visible. */
  get visible() {
    return !this.root.classList.contains('is-hidden')
  }

  /**
   * Updates toolbar placement used for popover positioning.
   *
   * @param placement - Current toolbar edge placement.
   */
  setToolbarPlacement(placement: AcExToolbarPlacement) {
    this.toolbarPlacement = placement
    if (this.visible && this.anchor) {
      this.positionNear(this.anchor)
    }
  }

  /** Updates header labels after a locale change. */
  refreshLocale() {
    this.layerList.refreshLocale()
  }

  /** Removes event listeners and removes the popover from the DOM. */
  destroy() {
    this.resizeObserver.disconnect()
    eventBus.off('close-layer-manager', this.handleCloseLayerManager)
    document.removeEventListener(
      'pointerdown',
      this.handleDocumentPointerDown,
      true
    )
    document.removeEventListener('keydown', this.handleDocumentKeyDown, true)
    this.layerList.destroy()
    this.root.remove()
  }

  /**
   * Positions the popover adjacent to the anchor, flipping when near viewport edges.
   * On compact (mobile) layouts, uses a bottom sheet within the viewer host.
   *
   * @param anchor - Reference button bounding box.
   */
  private positionNear(anchor: HTMLElement) {
    this.resetPopoverInlineSize()
    if (this.isCompactLayout()) {
      this.root.classList.add('is-compact')
      this.positionCompact()
      return
    }

    this.root.classList.remove('is-compact')
    this.positionNearAnchor(anchor)
  }

  /**
   * Positions the popover beside the toolbar anchor on desktop layouts.
   *
   * @param anchor - Reference button bounding box.
   */
  private positionNearAnchor(anchor: HTMLElement) {
    const inset = LAYER_POPOVER_VIEWPORT_INSET
    const rect = anchor.getBoundingClientRect()
    const hostRect = this.host.getBoundingClientRect()
    const panelWidth = this.constrainPopoverWidth(inset)
    const toolbarRect = this.getToolbarRect()
    const verticalToolbar =
      this.toolbarPlacement === 'left' || this.toolbarPlacement === 'right'

    let top: number
    let left: number
    let panelHeight: number

    if (verticalToolbar && toolbarRect) {
      const preferredHeight = Math.max(
        LAYER_POPOVER_MIN_HEIGHT,
        toolbarRect.height
      )
      panelHeight = this.applyPopoverHeight(preferredHeight)

      if (panelHeight >= toolbarRect.height) {
        top = toolbarRect.top + (toolbarRect.height - panelHeight) / 2
      } else {
        top = toolbarRect.top
      }

      if (this.toolbarPlacement === 'right') {
        left = rect.left - panelWidth - LAYER_POPOVER_GAP
      } else {
        left = rect.right + LAYER_POPOVER_GAP
      }
    } else {
      panelHeight = this.applyPopoverHeight(LAYER_POPOVER_MIN_HEIGHT)

      if (this.toolbarPlacement === 'right') {
        left = rect.left - panelWidth - LAYER_POPOVER_GAP
        top = rect.top
      } else if (this.toolbarPlacement === 'left') {
        left = rect.right + LAYER_POPOVER_GAP
        top = rect.top
      } else if (this.toolbarPlacement === 'top') {
        top = rect.bottom + LAYER_POPOVER_GAP
        left = rect.left
      } else {
        top = rect.top - panelHeight - LAYER_POPOVER_GAP
        left = rect.left
      }
    }

    if (left + panelWidth > hostRect.right - inset) {
      left = hostRect.right - panelWidth - inset
    }
    if (left < hostRect.left + inset) {
      left = hostRect.left + inset
    }

    ;({ top, panelHeight } = this.clampPopoverVerticalBounds(
      top,
      panelHeight,
      hostRect,
      inset
    ))

    this.root.style.top = `${top - hostRect.top}px`
    this.root.style.left = `${left - hostRect.left}px`
  }

  /** Positions the popover as a bottom sheet on compact layouts. */
  private positionCompact() {
    const inset = LAYER_POPOVER_VIEWPORT_INSET
    const width = Math.max(0, this.host.clientWidth - inset * 2)
    const maxHeight = this.getMaxPopoverHeight()
    const preferredHeight = Math.min(
      LAYER_POPOVER_COMPACT_MAX_HEIGHT,
      Math.max(
        LAYER_POPOVER_ABSOLUTE_MIN_HEIGHT,
        Math.round(this.host.clientHeight * LAYER_POPOVER_COMPACT_HEIGHT_RATIO)
      )
    )
    const height = this.applyPopoverHeight(preferredHeight, maxHeight)

    this.root.style.width = `${width}px`
    this.root.style.left = `${inset}px`
    this.root.style.top = `${Math.max(
      inset,
      this.host.clientHeight - height - inset
    )}px`
  }

  private applyPopoverHeight(
    preferredHeight: number,
    maxHeight = this.getMaxPopoverHeight()
  ): number {
    const height = Math.min(preferredHeight, maxHeight)
    this.root.style.maxHeight = `${maxHeight}px`
    this.root.style.height = `${height}px`
    return height
  }

  private resetPopoverInlineSize() {
    this.root.style.width = ''
    this.root.style.height = ''
    this.root.style.maxHeight = ''
  }

  private constrainPopoverWidth(inset: number): number {
    const maxWidth = Math.max(0, this.host.clientWidth - inset * 2)
    if (maxWidth > 0 && this.root.offsetWidth > maxWidth) {
      this.root.style.width = `${maxWidth}px`
    }
    return this.root.offsetWidth || maxWidth
  }

  private isCompactLayout(): boolean {
    return this.host.clientWidth <= LAYER_POPOVER_COMPACT_BREAKPOINT
  }

  private clampPopoverVerticalBounds(
    top: number,
    panelHeight: number,
    hostRect: DOMRect,
    inset: number
  ): { top: number; panelHeight: number } {
    const maxBottom = hostRect.bottom - inset
    const minTop = hostRect.top + inset

    if (top + panelHeight > maxBottom) {
      top = maxBottom - panelHeight
    }
    if (top < minTop) {
      top = minTop
      const availableHeight = maxBottom - top
      if (availableHeight < panelHeight) {
        panelHeight = this.applyPopoverHeight(
          Math.max(LAYER_POPOVER_ABSOLUTE_MIN_HEIGHT, availableHeight)
        )
      }
    }
    return { top, panelHeight }
  }

  private getMaxPopoverHeight(): number {
    return Math.max(
      LAYER_POPOVER_ABSOLUTE_MIN_HEIGHT,
      this.host.clientHeight - LAYER_POPOVER_VIEWPORT_INSET * 2
    )
  }

  private getToolbarRect(): DOMRect | undefined {
    const toolbar = this.host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')
    return toolbar?.getBoundingClientRect()
  }

  private findLayerButtonAnchor(): HTMLElement | undefined {
    return this.resolveLayerAnchor?.() ?? this.queryLayerButtonAnchor()
  }

  private queryLayerButtonAnchor(): HTMLElement | undefined {
    const button = this.host.querySelector<HTMLElement>(
      '[data-toolbar-item-id="layer"]'
    )
    return button ?? undefined
  }

  private focusInitialControl() {
    requestAnimationFrame(() => {
      if (!this.visible) return
      const focusable = this.root.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    })
  }

  private bindPopoverPointerGuard(element: HTMLElement) {
    element.addEventListener('pointerdown', event => event.stopPropagation())
  }
}
