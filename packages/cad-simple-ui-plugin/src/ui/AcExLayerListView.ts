import {
  AcApDocManager,
  type AcApLayerInfo,
  AcApLayerStore
} from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'

import type { AcExI18n } from '../i18n'
import { AcExColorPicker } from './AcExColorPicker'
import { ensureUiStyles } from './styles'

/** Sort direction for the layer name column. */
export type AcExLayerNameSortOrder = 'none' | 'asc' | 'desc'

/** Constructor options for {@link AcExLayerListView}. */
export interface AcExLayerListViewOptions {
  /** Document manager used to resolve the active document's layer store. */
  editor: AcApDocManager
  /** i18n helper for panel labels. */
  i18n: AcExI18n
  /** Viewer host used for theme CSS variables and color picker. */
  host: HTMLElement
  /** When true, renders a title header above the table. */
  showHeader?: boolean
}

/**
 * Reusable layer table view (name, visibility, color).
 *
 * Used in dock panel tabs (for example the layers tab).
 */
export class AcExLayerListView {
  /** Root element containing optional header and table. */
  readonly element: HTMLDivElement
  /** Layer table body receiving row nodes. */
  private tbody!: HTMLTableSectionElement
  /** Header checkbox toggling all layers on/off. */
  private masterCheckbox!: HTMLInputElement
  /** Panel title label element when {@link showHeader} is true. */
  private titleEl?: HTMLSpanElement
  /** Name column header cell. */
  private nameHeaderEl!: HTMLTableCellElement
  /** Name column header label text. */
  private nameHeaderLabelEl!: HTMLSpanElement
  /** Name column sort indicator. */
  private nameSortIndicatorEl!: HTMLSpanElement
  /** On column header label. */
  private onLabelEl!: HTMLSpanElement
  /** Color column header cell. */
  private colorHeaderEl!: HTMLTableCellElement
  /** Document manager whose active document supplies layer data. */
  private readonly editor: AcApDocManager
  /** Layer store currently subscribed for change notifications. */
  private subscribedLayerStore?: AcApLayerStore
  /** i18n helper for labels and toasts. */
  private readonly i18n: AcExI18n
  /** Viewer host reference. */
  private readonly host: HTMLElement
  /** Whether a title header is rendered above the table. */
  private readonly showHeader: boolean
  /** Current sort direction for the name column. */
  private nameSortOrder: AcExLayerNameSortOrder = 'none'

  /**
   * @param options - Editor, i18n, host, and display options.
   */
  constructor(options: AcExLayerListViewOptions) {
    this.editor = options.editor
    this.i18n = options.i18n
    this.host = options.host
    this.showHeader = options.showHeader ?? false
    ensureUiStyles()

    this.element = document.createElement('div')
    this.element.className = 'ml-ex-ui-layer-list'

    if (this.showHeader) {
      const header = document.createElement('div')
      header.className = 'ml-ex-ui-layer-manager-header'

      const title = document.createElement('span')
      this.titleEl = title
      title.textContent = options.i18n.t('layerManager.title')
      header.appendChild(title)
      this.element.appendChild(header)
    }

    const tableWrap = document.createElement('div')
    tableWrap.className = 'ml-ex-ui-layer-table-wrap'

    const table = document.createElement('table')
    table.className = 'ml-ex-ui-layer-table'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')

    const nameTh = document.createElement('th')
    this.nameHeaderEl = nameTh
    nameTh.className = 'ml-ex-ui-layer-name-header is-sortable'
    nameTh.setAttribute('role', 'columnheader')
    nameTh.setAttribute('aria-sort', 'none')
    const nameHeaderContent = document.createElement('button')
    nameHeaderContent.type = 'button'
    nameHeaderContent.className = 'ml-ex-ui-layer-name-sort'
    const nameLabel = document.createElement('span')
    this.nameHeaderLabelEl = nameLabel
    nameLabel.textContent = options.i18n.t('layerManager.name')
    const sortIndicator = document.createElement('span')
    this.nameSortIndicatorEl = sortIndicator
    sortIndicator.className = 'ml-ex-ui-layer-sort-indicator'
    sortIndicator.setAttribute('aria-hidden', 'true')
    nameHeaderContent.appendChild(nameLabel)
    nameHeaderContent.appendChild(sortIndicator)
    nameHeaderContent.addEventListener('click', () => {
      this.cycleNameSortOrder()
    })
    nameTh.appendChild(nameHeaderContent)
    this.updateNameSortHeader()

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
    this.element.appendChild(tableWrap)

    this.editor.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
    this.bindToActiveDocument()
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

  /** Updates header labels after a locale change. */
  refreshLocale() {
    if (this.titleEl) {
      this.titleEl.textContent = this.i18n.t('layerManager.title')
    }
    this.nameHeaderLabelEl.textContent = this.i18n.t('layerManager.name')
    this.onLabelEl.textContent = this.i18n.t('layerManager.on')
    this.colorHeaderEl.textContent = this.i18n.t('layerManager.color')
    this.updateNameSortHeader()
  }

  /** Cycles name-column sort: none → ascending → descending → none. */
  private cycleNameSortOrder() {
    if (this.nameSortOrder === 'none') {
      this.nameSortOrder = 'asc'
    } else if (this.nameSortOrder === 'asc') {
      this.nameSortOrder = 'desc'
    } else {
      this.nameSortOrder = 'none'
    }
    this.updateNameSortHeader()
    this.renderRows()
  }

  /** Syncs name-header aria/title/indicator with {@link nameSortOrder}. */
  private updateNameSortHeader() {
    const sortTitleKey =
      this.nameSortOrder === 'asc'
        ? 'layerManager.sortByNameDesc'
        : this.nameSortOrder === 'desc'
          ? 'layerManager.sortByNameNone'
          : 'layerManager.sortByNameAsc'
    const title = this.i18n.t(sortTitleKey)
    this.nameHeaderEl.title = title
    this.nameHeaderEl
      .querySelector('button')
      ?.setAttribute('aria-label', title)
    this.nameHeaderEl.setAttribute(
      'aria-sort',
      this.nameSortOrder === 'asc'
        ? 'ascending'
        : this.nameSortOrder === 'desc'
          ? 'descending'
          : 'none'
    )
    this.nameHeaderEl.classList.toggle(
      'is-sorted-asc',
      this.nameSortOrder === 'asc'
    )
    this.nameHeaderEl.classList.toggle(
      'is-sorted-desc',
      this.nameSortOrder === 'desc'
    )
    this.nameSortIndicatorEl.textContent =
      this.nameSortOrder === 'asc'
        ? '▲'
        : this.nameSortOrder === 'desc'
          ? '▼'
          : ''
  }

  /**
   * Returns layers ordered by the current name sort setting.
   *
   * @param layers - Layer snapshots from the store.
   */
  private getSortedLayers(layers: AcApLayerInfo[]): AcApLayerInfo[] {
    if (this.nameSortOrder === 'none') {
      return layers
    }
    const direction = this.nameSortOrder === 'asc' ? 1 : -1
    return [...layers].sort(
      (a, b) =>
        direction *
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
    )
  }

  /** Removes event listeners. Does not remove DOM (caller owns mount point). */
  destroy() {
    this.editor.events.documentActivated.removeEventListener(
      this.handleDocumentActivated
    )
    if (this.subscribedLayerStore) {
      this.subscribedLayerStore.events.changed.removeEventListener(
        this.handleLayersChanged
      )
    }
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

    const layers = this.getSortedLayers(store.getLayers())
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
      const success = AcApDocManager.instance.curView?.zoomToFitLayer(
        layer.name
      )
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
