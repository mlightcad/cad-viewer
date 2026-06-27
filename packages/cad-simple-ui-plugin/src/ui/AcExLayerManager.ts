import {
  AcApDocManager,
  type AcApLayerInfo,
  AcApLayerStore,
  eventBus} from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'

import type { AcExToolbarPlacement } from '../config/types'
import type { AcExI18n } from '../i18n'
import { AcExColorPicker } from './AcExColorPicker'
import { ensureUiStyles } from './styles'

/** Minimum top/bottom margin for default panel placement and height. */
const LAYER_MANAGER_VERTICAL_MARGIN = 150
/** Horizontal inset from the host edge for default placement. */
const LAYER_MANAGER_HORIZONTAL_MARGIN = 8
/** Minimum panel height (px). */
const LAYER_MANAGER_MIN_HEIGHT = 120

/** Constructor options for {@link AcExLayerManager}. */
export interface AcExLayerManagerOptions {
  /** Document manager used to resolve the active document's layer store. */
  editor: AcApDocManager
  /** i18n helper for panel labels. */
  i18n: AcExI18n
  /** Viewer host used for containment and default positioning. */
  host: HTMLElement
  /** Toolbar placement used to pick the opposite side for the panel. */
  toolbarPlacement?: AcExToolbarPlacement
  /** When false, the panel is clamped inside `host`. */
  allowMoveOutsideCanvas?: boolean
}

/**
 * Draggable, resizable floating panel for layer visibility and color editing.
 */
export class AcExLayerManager {
  /** Root panel element. */
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
  /** Active pointer drag state for header dragging. */
  private dragState?: {
    pointerId: number
    offsetX: number
    offsetY: number
  }
  /** Active pointer resize state for the bottom handle. */
  private resizeState?: {
    pointerId: number
    startY: number
    startHeight: number
  }
  /** Whether the panel may be positioned outside the host bounds. */
  private readonly allowMoveOutsideCanvas: boolean
  /** Viewer host reference. */
  private readonly host: HTMLElement
  /** Document manager whose active document supplies layer data. */
  private readonly editor: AcApDocManager
  /** Layer store currently subscribed for change notifications. */
  private subscribedLayerStore?: AcApLayerStore
  /** i18n helper for labels and toasts. */
  private readonly i18n: AcExI18n
  /** Toolbar placement for default horizontal positioning. */
  private toolbarPlacement: AcExToolbarPlacement
  /** Whether the user has manually dragged the panel. */
  private hasUserPosition = false
  /** Whether the user has manually resized the panel height. */
  private hasUserResize = false

  /** Hides the panel when the global `close-layer-manager` event fires. */
  private handleCloseLayerManager = () => {
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
    this.allowMoveOutsideCanvas = options.allowMoveOutsideCanvas ?? false
    ensureUiStyles()

    this.root = document.createElement('div')
    this.root.className = 'ml-ex-ui-layer-manager is-hidden'
    if (!this.allowMoveOutsideCanvas) {
      this.root.classList.add('is-contained')
    }

    const header = document.createElement('div')
    header.className = 'ml-ex-ui-layer-manager-header'

    const title = document.createElement('span')
    this.titleEl = title
    title.textContent = options.i18n.t('layerManager.title')

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'ml-ex-ui-layer-manager-close'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', () => this.hide())

    header.appendChild(title)
    header.appendChild(closeBtn)
    this.bindDrag(header)

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

    const resizeHandle = document.createElement('div')
    resizeHandle.className = 'ml-ex-ui-layer-manager-resize'
    resizeHandle.setAttribute('aria-label', 'Resize')
    this.bindResize(resizeHandle)
    this.root.appendChild(resizeHandle)

    if (this.allowMoveOutsideCanvas) {
      document.body.appendChild(this.root)
    } else {
      if (getComputedStyle(this.host).position === 'static') {
        this.host.style.position = 'relative'
      }
      this.host.appendChild(this.root)
    }

    this.editor.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
    this.bindToActiveDocument()
    eventBus.on('close-layer-manager', this.handleCloseLayerManager)
    this.renderRows()
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

  /** Shows the panel and applies default position when not yet user-placed. */
  show() {
    this.root.classList.remove('is-hidden')
    if (!this.hasUserPosition) {
      this.applyDefaultPosition()
    }
    this.renderRows()
  }

  /** Hides the panel without destroying it. */
  hide() {
    this.root.classList.add('is-hidden')
  }

  /** Shows the panel if hidden, otherwise hides it. */
  toggle() {
    if (this.root.classList.contains('is-hidden')) {
      this.show()
    } else {
      this.hide()
    }
  }

  /** Whether the panel is currently visible. */
  get visible() {
    return !this.root.classList.contains('is-hidden')
  }

  /**
   * Updates toolbar placement used for default horizontal positioning.
   *
   * @param placement - Current toolbar edge placement.
   */
  setToolbarPlacement(placement: AcExToolbarPlacement) {
    this.toolbarPlacement = placement
    if (!this.hasUserPosition && this.visible) {
      this.applyDefaultPosition()
    }
  }

  /** Updates header labels after a locale change. */
  refreshLocale() {
    this.titleEl.textContent = this.i18n.t('layerManager.title')
    this.nameHeaderEl.textContent = this.i18n.t('layerManager.name')
    this.onLabelEl.textContent = this.i18n.t('layerManager.on')
    this.colorHeaderEl.textContent = this.i18n.t('layerManager.color')
  }

  /** Removes event listeners and removes the panel from the DOM. */
  destroy() {
    eventBus.off('close-layer-manager', this.handleCloseLayerManager)
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
    nameCell.textContent =
      layer.name === currentLayer ? `${layer.name} *` : layer.name

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
   * Enables drag-to-move on the panel header.
   *
   * @param header - Header element receiving pointer events.
   */
  private bindDrag(header: HTMLElement) {
    header.addEventListener('pointerdown', event => {
      if (!(event.target instanceof HTMLElement)) return
      if (event.target.closest('.ml-ex-ui-layer-manager-close')) return

      const rect = this.root.getBoundingClientRect()
      this.dragState = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      }
      header.setPointerCapture(event.pointerId)
    })

    header.addEventListener('pointermove', event => {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) return
      this.hasUserPosition = true
      this.setPosition(
        event.clientX - this.dragState.offsetX,
        event.clientY - this.dragState.offsetY
      )
    })

    const endDrag = (event: PointerEvent) => {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) return
      this.dragState = undefined
      header.releasePointerCapture(event.pointerId)
    }

    header.addEventListener('pointerup', endDrag)
    header.addEventListener('pointercancel', endDrag)
  }

  /**
   * Enables vertical resize via the bottom handle.
   *
   * @param handle - Resize handle element.
   */
  private bindResize(handle: HTMLElement) {
    handle.addEventListener('pointerdown', event => {
      event.preventDefault()
      this.resizeState = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: this.root.offsetHeight
      }
      handle.setPointerCapture(event.pointerId)
    })

    handle.addEventListener('pointermove', event => {
      if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) {
        return
      }
      const delta = event.clientY - this.resizeState.startY
      const maxHeight = this.getResizeMaxPanelHeight()
      const nextHeight = Math.max(
        LAYER_MANAGER_MIN_HEIGHT,
        Math.min(maxHeight, this.resizeState.startHeight + delta)
      )
      this.hasUserResize = true
      this.root.style.height = `${nextHeight}px`
      this.root.style.maxHeight = `${nextHeight}px`
    })

    const endResize = (event: PointerEvent) => {
      if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) {
        return
      }
      this.resizeState = undefined
      handle.releasePointerCapture(event.pointerId)
    }

    handle.addEventListener('pointerup', endResize)
    handle.addEventListener('pointercancel', endResize)
  }

  /**
   * Default panel height: canvas height minus 150px top and bottom margins.
   */
  private getDefaultPanelHeight(): number {
    if (this.allowMoveOutsideCanvas) {
      return Math.max(
        LAYER_MANAGER_MIN_HEIGHT,
        window.innerHeight - LAYER_MANAGER_VERTICAL_MARGIN * 2
      )
    }
    return Math.max(
      LAYER_MANAGER_MIN_HEIGHT,
      this.host.clientHeight - LAYER_MANAGER_VERTICAL_MARGIN * 2
    )
  }

  /**
   * Maximum height while the user is resizing (full canvas; no 150px margin).
   */
  private getResizeMaxPanelHeight(): number {
    if (this.allowMoveOutsideCanvas) {
      return Math.max(LAYER_MANAGER_MIN_HEIGHT, window.innerHeight)
    }
    return Math.max(LAYER_MANAGER_MIN_HEIGHT, this.host.clientHeight)
  }

  /**
   * Centers the panel vertically and places it on the side opposite the toolbar.
   */
  private applyDefaultPosition() {
    if (!this.hasUserResize) {
      const defaultHeight = this.getDefaultPanelHeight()
      this.root.style.height = `${defaultHeight}px`
      this.root.style.maxHeight = `${defaultHeight}px`
    }

    const hostWidth = this.host.clientWidth
    const hostHeight = this.host.clientHeight
    const panelWidth = this.root.offsetWidth
    const panelHeight = this.root.offsetHeight
    const availableHeight = hostHeight - LAYER_MANAGER_VERTICAL_MARGIN * 2
    const top =
      LAYER_MANAGER_VERTICAL_MARGIN +
      Math.max(0, (availableHeight - panelHeight) / 2)

    let left: number
    if (this.toolbarPlacement === 'right') {
      left = LAYER_MANAGER_HORIZONTAL_MARGIN
    } else {
      left = Math.max(
        LAYER_MANAGER_HORIZONTAL_MARGIN,
        hostWidth - panelWidth - LAYER_MANAGER_HORIZONTAL_MARGIN
      )
    }

    if (this.allowMoveOutsideCanvas) {
      const hostRect = this.host.getBoundingClientRect()
      this.root.style.left = `${hostRect.left + left}px`
      this.root.style.top = `${hostRect.top + top}px`
      return
    }

    this.root.style.left = `${left}px`
    this.root.style.top = `${top}px`
  }

  /**
   * Sets panel position in viewport or host-local coordinates.
   *
   * @param clientLeft - Desired left edge in viewport coordinates.
   * @param clientTop - Desired top edge in viewport coordinates.
   */
  private setPosition(clientLeft: number, clientTop: number) {
    if (this.allowMoveOutsideCanvas) {
      this.root.style.left = `${clientLeft}px`
      this.root.style.top = `${clientTop}px`
      return
    }

    const hostRect = this.host.getBoundingClientRect()
    let left = clientLeft - hostRect.left
    let top = clientTop - hostRect.top
    const maxLeft = Math.max(0, this.host.clientWidth - this.root.offsetWidth)
    const maxTop = Math.max(0, this.host.clientHeight - this.root.offsetHeight)
    left = Math.max(0, Math.min(left, maxLeft))
    top = Math.max(0, Math.min(top, maxTop))
    this.root.style.left = `${left}px`
    this.root.style.top = `${top}px`
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
