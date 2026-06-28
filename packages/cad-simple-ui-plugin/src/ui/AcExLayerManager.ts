import {
  AcApDocManager,
  type AcApLayerInfo,
  AcApLayerStore,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'

import type { AcExToolbarPlacement } from '../config/types'
import type { AcExI18n } from '../i18n'
import { AcExColorPicker } from './AcExColorPicker'
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
export interface AcExLayerManagerOptions {
  /** Document manager used to resolve the active document's layer store. */
  editor: AcApDocManager
  /** i18n helper for panel labels. */
  i18n: AcExI18n
  /** Viewer host used for containment and theme CSS variables. */
  host: HTMLElement
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
export class AcExLayerManager {
  /** Root popover element. */
  private root: HTMLDivElement
  /** Layer table body receiving row nodes. */
  private tbody!: HTMLTableSectionElement
  /** Header checkbox toggling all layers on/off. */
  private masterCheckbox!: HTMLInputElement
  /** Panel title label element. */
  private titleEl!: HTMLSpanElement
  /** Name column header cell. */
  private nameHeaderEl!: HTMLTableCellElement
  /** On column header label. */
  private onLabelEl!: HTMLSpanElement
  /** Color column header cell. */
  private colorHeaderEl!: HTMLTableCellElement
  /** Viewer host reference. */
  private readonly host: HTMLElement
  /** Document manager whose active document supplies layer data. */
  private readonly editor: AcApDocManager
  /** Layer store currently subscribed for change notifications. */
  private subscribedLayerStore?: AcApLayerStore
  /** i18n helper for labels and toasts. */
  private readonly i18n: AcExI18n
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
    this.editor = options.editor
    this.i18n = options.i18n
    this.host = options.host
    this.toolbarPlacement = options.toolbarPlacement ?? 'right'
    this.resolveLayerAnchor = options.resolveLayerAnchor
    ensureUiStyles()

    this.root = document.createElement('div')
    this.root.className = 'ml-ex-ui-layer-manager is-hidden'
    this.root.setAttribute('role', 'dialog')
    this.root.setAttribute('aria-modal', 'false')
    this.root.setAttribute('aria-labelledby', LAYER_MANAGER_TITLE_ID)

    const header = document.createElement('div')
    header.className = 'ml-ex-ui-layer-manager-header'

    const title = document.createElement('span')
    this.titleEl = title
    title.id = LAYER_MANAGER_TITLE_ID
    title.textContent = options.i18n.t('layerManager.title')

    header.appendChild(title)
    this.bindPopoverPointerGuard(header)

    const tableWrap = document.createElement('div')
    tableWrap.className = 'ml-ex-ui-layer-table-wrap'

    const table = document.createElement('table')
    table.className = 'ml-ex-ui-layer-table'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')

    const nameTh = document.createElement('th')
    this.nameHeaderEl = nameTh
    nameTh.textContent = options.i18n.t('layerManager.name')

    const onTh = document.createElement('th')
    onTh.className = 'center'
    const onHeader = document.createElement('div')
    onHeader.className = 'ml-ex-ui-layer-header-on'
    const onLabel = document.createElement('span')
    this.onLabelEl = onLabel
    onLabel.textContent = options.i18n.t('layerManager.on')
    this.masterCheckbox = document.createElement('input')
    this.masterCheckbox.type = 'checkbox'
    this.masterCheckbox.addEventListener('change', () => {
      const store = this.activeLayerStore
      if (!store) return
      if (this.masterCheckbox.checked) {
        store.setAllLayersOn()
      } else {
        store.setAllLayersOffExceptCurrent()
      }
    })
    onHeader.appendChild(onLabel)
    onHeader.appendChild(this.masterCheckbox)
    onTh.appendChild(onHeader)

    const colorTh = document.createElement('th')
    colorTh.className = 'center'
    this.colorHeaderEl = colorTh
    colorTh.textContent = options.i18n.t('layerManager.color')

    headRow.appendChild(nameTh)
    headRow.appendChild(onTh)
    headRow.appendChild(colorTh)
    thead.appendChild(headRow)

    this.tbody = document.createElement('tbody')

    table.appendChild(thead)
    table.appendChild(this.tbody)
    tableWrap.appendChild(table)

    this.root.appendChild(header)
    this.root.appendChild(tableWrap)
    this.bindPopoverPointerGuard(tableWrap)

    if (getComputedStyle(this.host).position === 'static') {
      this.host.style.position = 'relative'
    }

    this.host.appendChild(this.root)

    this.editor.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
    this.bindToActiveDocument()
    eventBus.on('close-layer-manager', this.handleCloseLayerManager)
    this.renderRows()

    this.resizeObserver = new ResizeObserver(() => {
      if (this.visible && this.anchor) {
        this.positionNear(this.anchor)
      }
    })
    this.resizeObserver.observe(this.host)
  }

  /** Layer store for the active document, when one is open. */
  private get activeLayerStore(): AcApLayerStore | undefined {
    return this.editor.curDocument?.layerStore
  }

  /** Subscribes to the active document's layer store after document switches. */
  private bindToActiveDocument() {
    if (this.subscribedLayerStore) {
      this.subscribedLayerStore.events.changed.removeEventListener(
        this.handleLayersChanged
      )
    }

    this.subscribedLayerStore = this.activeLayerStore
    if (this.subscribedLayerStore) {
      this.subscribedLayerStore.events.changed.addEventListener(
        this.handleLayersChanged
      )
    }
  }

  private handleDocumentActivated = () => {
    this.bindToActiveDocument()
    this.renderRows()
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
    this.renderRows()
    document.addEventListener('pointerdown', this.handleDocumentPointerDown, true)
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
    this.titleEl.textContent = this.i18n.t('layerManager.title')
    this.nameHeaderEl.textContent = this.i18n.t('layerManager.name')
    this.onLabelEl.textContent = this.i18n.t('layerManager.on')
    this.colorHeaderEl.textContent = this.i18n.t('layerManager.color')
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
    this.editor.events.documentActivated.removeEventListener(
      this.handleDocumentActivated
    )
    if (this.subscribedLayerStore) {
      this.subscribedLayerStore.events.changed.removeEventListener(
        this.handleLayersChanged
      )
    }
    this.root.remove()
  }

  /** Rebuilds table body rows when {@link AcApLayerStore} data changes. */
  private handleLayersChanged = () => {
    this.renderRows()
  }

  /** Rebuilds table body rows from {@link AcApLayerStore} data. */
  private renderRows() {
    const store = this.activeLayerStore
    this.tbody.replaceChildren()
    if (!store) {
      this.masterCheckbox.checked = false
      this.masterCheckbox.indeterminate = false
      return
    }

    const layers = store.getLayers()
    const currentLayer = store.getCurrentLayerName()

    layers.forEach(layer => {
      this.tbody.appendChild(this.createRow(layer, currentLayer))
    })

    const allOn = layers.length > 0 && layers.every(layer => layer.isOn)
    const someOn = layers.some(layer => layer.isOn)
    this.masterCheckbox.checked = allOn
    this.masterCheckbox.indeterminate = someOn && !allOn
  }

  /**
   * Creates a table row for one layer.
   *
   * @param layer - Layer snapshot to display.
   * @param currentLayer - Name of the current drawing layer (`CLAYER`).
   */
  private createRow(layer: AcApLayerInfo, currentLayer: string) {
    const row = document.createElement('tr')
    row.addEventListener('dblclick', () => {
      const success = AcApDocManager.instance.curView?.zoomToFitLayer(layer.name)
      if (success) {
        this.showToast(
          this.i18n.t('layerManager.zoomToLayer', { layer: layer.name })
        )
      }
    })

    const nameCell = document.createElement('td')
    const nameEl = document.createElement('span')
    nameEl.className = 'ml-ex-ui-layer-name'
    nameEl.textContent = layer.name
    if (layer.name === currentLayer) {
      const marker = document.createElement('span')
      marker.className = 'ml-ex-ui-layer-current-marker'
      marker.textContent = '*'
      marker.title = this.i18n.t('layerManager.currentLayer')
      marker.setAttribute('aria-hidden', 'true')
      nameEl.appendChild(marker)
    }
    nameCell.appendChild(nameEl)

    const onCell = document.createElement('td')
    onCell.className = 'center'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = layer.isOn
    checkbox.addEventListener('change', () => {
      this.activeLayerStore?.setLayerOn(layer.name, checkbox.checked)
    })
    onCell.appendChild(checkbox)

    const colorCell = document.createElement('td')
    colorCell.className = 'center'
    const swatch = document.createElement('span')
    swatch.className = 'ml-ex-ui-layer-color'
    swatch.style.background = layer.cssColor
    swatch.addEventListener('click', async () => {
      const initial = AcCmColor.fromString(layer.color)
      const picker = new AcExColorPicker(
        this.i18n,
        this.host,
        initial ?? undefined
      )
      const selected = await picker.open()
      if (selected) {
        this.activeLayerStore?.setLayerColor(layer.name, selected)
      }
    })
    colorCell.appendChild(swatch)

    row.appendChild(nameCell)
    row.appendChild(onCell)
    row.appendChild(colorCell)
    return row
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
   * For vertical toolbars, height and vertical edges align with the toolbar;
   * {@link LAYER_POPOVER_MIN_HEIGHT} applies when the toolbar is shorter.
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
      const preferredHeight = Math.max(LAYER_POPOVER_MIN_HEIGHT, toolbarRect.height)
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

  /**
   * Applies popover height constraints and returns the resolved height.
   *
   * @param preferredHeight - Desired height before clamping.
   * @param maxHeight - Optional maximum height override.
   */
  private applyPopoverHeight(
    preferredHeight: number,
    maxHeight = this.getMaxPopoverHeight()
  ): number {
    const height = Math.min(preferredHeight, maxHeight)
    this.root.style.maxHeight = `${maxHeight}px`
    this.root.style.height = `${height}px`
    return height
  }

  /** Clears inline size overrides so CSS defaults can apply on desktop. */
  private resetPopoverInlineSize() {
    this.root.style.width = ''
    this.root.style.height = ''
    this.root.style.maxHeight = ''
  }

  /**
   * Clamps popover width so it never exceeds the viewer host.
   *
   * @param inset - Edge inset used for width calculation.
   */
  private constrainPopoverWidth(inset: number): number {
    const maxWidth = Math.max(0, this.host.clientWidth - inset * 2)
    if (maxWidth > 0 && this.root.offsetWidth > maxWidth) {
      this.root.style.width = `${maxWidth}px`
    }
    return this.root.offsetWidth || maxWidth
  }

  /** Whether the viewer host is narrow enough to use compact layout. */
  private isCompactLayout(): boolean {
    return this.host.clientWidth <= LAYER_POPOVER_COMPACT_BREAKPOINT
  }

  /**
   * Clamps popover vertical position and height within the host.
   */
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

  /** Maximum popover height based on the viewer host size. */
  private getMaxPopoverHeight(): number {
    return Math.max(
      LAYER_POPOVER_ABSOLUTE_MIN_HEIGHT,
      this.host.clientHeight - LAYER_POPOVER_VIEWPORT_INSET * 2
    )
  }

  /** Returns the toolbar bounding box in viewport coordinates, when present. */
  private getToolbarRect(): DOMRect | undefined {
    const toolbar = this.host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')
    return toolbar?.getBoundingClientRect()
  }

  /** Finds the layer toolbar button in the host, when the toolbar is present. */
  private findLayerButtonAnchor(): HTMLElement | undefined {
    return this.resolveLayerAnchor?.() ?? this.queryLayerButtonAnchor()
  }

  /** Queries the host for the layer toolbar button without expanding the toolbar. */
  private queryLayerButtonAnchor(): HTMLElement | undefined {
    const button = this.host.querySelector<HTMLElement>(
      '[data-toolbar-item-id="layer"]'
    )
    return button ?? undefined
  }

  /** Moves focus to the first interactive control inside the popover. */
  private focusInitialControl() {
    requestAnimationFrame(() => {
      if (!this.visible) return
      const focusable = this.root.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    })
  }

  /**
   * Stops pointer events from bubbling so canvas handlers do not close the popover.
   *
   * @param element - Popover section to guard.
   */
  private bindPopoverPointerGuard(element: HTMLElement) {
    element.addEventListener('pointerdown', event => event.stopPropagation())
  }

  /**
   * Shows a short-lived toast message at the top of the viewport.
   *
   * @param message - Text to display.
   */
  private showToast(message: string) {
    const toast = document.createElement('div')
    toast.className = 'ml-ex-ui-toast'
    toast.textContent = message
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 1500)
  }
}
