import {
  AcApDocManager,
  type AcApMeasurementRecord,
  type AcApMeasurementType,
  clearLayoutMeasurements,
  focusMeasurement,
  getMeasurementValueText,
  getSelectedMeasurementId,
  listLayoutMeasurements,
  removeMeasurement,
  subscribeMeasurements,
  subscribeMeasurementSelection
} from '@mlightcad/cad-simple-viewer'

import type { AcUiI18n } from '../i18n'
import { acuiEnsureUiStyles } from './styles'

/** Types exposed as filter toggles in the measurement list. */
const MEASURE_FILTER_TYPES = ['distance', 'arc', 'angle', 'area'] as const

type AcUiMeasureFilterType = (typeof MEASURE_FILTER_TYPES)[number]

/** Constructor options for {@link AcUiMeasurementPaletteView}. */
export interface AcUiMeasurementPaletteViewOptions {
  /** Document manager used to resolve the active view for measurement actions. */
  editor: AcApDocManager
  /** i18n helper for panel labels. */
  i18n: AcUiI18n
}

/**
 * Measurement list view for the dock panel.
 *
 * Lists committed measurements, zooms to a row on click, and supports
 * per-item delete plus clear-all.
 */
export class AcUiMeasurementPaletteView {
  /** Root element mounted in the dock panel measurements tab. */
  readonly element: HTMLDivElement
  /** Type filter buttons (distance / arc / angle / area). */
  private readonly filterButtons = new Map<
    AcUiMeasureFilterType,
    HTMLButtonElement
  >()
  /** Filter group used for the accessible name. */
  private filterGroup!: HTMLDivElement
  /** Active type filter, or `undefined` to show every measurement. */
  private activeFilter: AcUiMeasureFilterType | undefined
  /** Clears every measurement on the active layout. */
  private clearButton!: HTMLButtonElement
  /** Type column header. */
  private typeHeaderEl!: HTMLTableCellElement
  /** Value column header. */
  private valueHeaderEl!: HTMLTableCellElement
  /** Actions column header (visually empty). */
  private actionsHeaderEl!: HTMLTableCellElement
  /** Measurement table body. */
  private tbody!: HTMLTableSectionElement
  /** Document manager whose current view receives measurement actions. */
  private readonly editor: AcApDocManager
  /** i18n helper for labels. */
  private readonly i18n: AcUiI18n
  /** Latest measurement records from the active layout. */
  private measurements: AcApMeasurementRecord[] = []
  /** Currently selected measurement id. */
  private selectedId: string | undefined
  /** Last list signature used to avoid rebuilding rows on selection-only updates. */
  private tableContentKey = ''
  /** Unsubscribes from measurement list changes. */
  private unsubscribeList?: () => void
  /** Unsubscribes from measurement selection changes. */
  private unsubscribeSelection?: () => void

  /**
   * @param options - Editor and i18n used to render and mutate measurements.
   */
  constructor(options: AcUiMeasurementPaletteViewOptions) {
    this.editor = options.editor
    this.i18n = options.i18n
    acuiEnsureUiStyles()

    this.element = document.createElement('div')
    this.element.className = 'ml-ex-ui-measure-palette'
    this.buildDom()
    this.refreshLocale()
    this.unsubscribeList = subscribeMeasurements(() => this.syncFromStore())
    this.unsubscribeSelection = subscribeMeasurementSelection(() =>
      this.syncFromStore()
    )
    this.syncFromStore()
  }

  /** Updates labels after a locale change. */
  refreshLocale() {
    this.filterGroup.setAttribute(
      'aria-label',
      this.i18n.t('measurePalette.filterGroup')
    )
    for (const [type, button] of this.filterButtons) {
      const label = this.i18n.t(`measurePalette.typeValues.${type}`)
      button.textContent = label
      button.title = label
      button.setAttribute('aria-label', label)
    }
    this.clearButton.textContent = this.i18n.t('measurePalette.clear')
    this.typeHeaderEl.textContent = this.i18n.t('measurePalette.type')
    this.valueHeaderEl.textContent = this.i18n.t('measurePalette.value')
    this.renderTable()
  }

  /** Removes store subscriptions. Does not remove DOM. */
  destroy() {
    this.unsubscribeList?.()
    this.unsubscribeList = undefined
    this.unsubscribeSelection?.()
    this.unsubscribeSelection = undefined
  }

  /** Builds static toolbar and table DOM. */
  private buildDom() {
    const toolbar = document.createElement('div')
    toolbar.className = 'ml-ex-ui-measure-toolbar'

    this.filterGroup = document.createElement('div')
    this.filterGroup.className = 'ml-ex-ui-measure-filter'
    this.filterGroup.setAttribute('role', 'group')
    for (const type of MEASURE_FILTER_TYPES) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ml-ex-ui-measure-filter-btn'
      button.dataset.measureFilter = type
      button.setAttribute('aria-pressed', 'false')
      button.addEventListener('click', () => this.toggleFilter(type))
      this.filterButtons.set(type, button)
      this.filterGroup.appendChild(button)
    }
    toolbar.appendChild(this.filterGroup)

    this.clearButton = document.createElement('button')
    this.clearButton.type = 'button'
    this.clearButton.className = 'ml-ex-ui-measure-btn'
    this.clearButton.addEventListener('click', () => this.clearAll())
    toolbar.appendChild(this.clearButton)
    this.element.appendChild(toolbar)

    const tableWrap = document.createElement('div')
    tableWrap.className = 'ml-ex-ui-measure-table-wrap'

    const table = document.createElement('table')
    table.className = 'ml-ex-ui-measure-table'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    this.typeHeaderEl = document.createElement('th')
    this.valueHeaderEl = document.createElement('th')
    this.actionsHeaderEl = document.createElement('th')
    this.actionsHeaderEl.className = 'ml-ex-ui-measure-actions-col'
    headRow.append(this.typeHeaderEl, this.valueHeaderEl, this.actionsHeaderEl)
    thead.appendChild(headRow)
    table.appendChild(thead)

    this.tbody = document.createElement('tbody')
    this.tbody.addEventListener('click', event => {
      const target = event.target
      if (!(target instanceof Element)) return
      const deleteBtn = target.closest('button[data-measure-delete]')
      if (deleteBtn instanceof HTMLElement && this.tbody.contains(deleteBtn)) {
        event.stopPropagation()
        const id = deleteBtn.dataset.measureDelete
        if (id) this.removeOne(id)
        return
      }
      const id = this.rowMeasurementId(event)
      if (id) this.handleRowClick(id)
    })
    table.appendChild(this.tbody)
    tableWrap.appendChild(table)
    this.element.appendChild(tableWrap)
  }

  /** Pulls the measurement list/selection and refreshes the view. */
  private syncFromStore() {
    const view = this.editor.curView
    this.measurements = view ? listLayoutMeasurements(view) : []
    this.selectedId = getSelectedMeasurementId()
    this.clearButton.disabled = this.measurements.length === 0
    this.refreshTable()
  }

  /** Row measurement id from a bubbled table event, if any. */
  private rowMeasurementId(event: Event): string | undefined {
    const target = event.target
    if (!(target instanceof Element)) return undefined
    const row = target.closest('tr[data-measure-id]')
    if (!row || !this.tbody.contains(row)) return undefined
    return row instanceof HTMLElement ? row.dataset.measureId : undefined
  }

  /** Rebuilds rows only when list content changes; otherwise updates selection. */
  private refreshTable() {
    const db = this.editor.curDocument?.database
    const key = this.measurements
      .map(
        record =>
          `${record.id}\t${record.type}\t${getMeasurementValueText(record.id, db)}`
      )
      .join('\n')
    if (
      key === this.tableContentKey &&
      this.tbody.querySelector(
        'tr[data-measure-id], .ml-ex-ui-measure-empty-row'
      )
    ) {
      this.syncRowSelection()
      return
    }
    this.tableContentKey = key
    this.renderTable()
  }

  /** Toggles `is-selected` on existing rows without replacing them. */
  private syncRowSelection() {
    this.tbody
      .querySelectorAll<HTMLTableRowElement>('tr[data-measure-id]')
      .forEach(row => {
        row.classList.toggle(
          'is-selected',
          row.dataset.measureId === this.selectedId
        )
      })
  }

  /** Rebuilds table rows from the filtered measurement list. */
  private renderTable() {
    const rows = this.filteredMeasurements()
    const db = this.editor.curDocument?.database
    this.tbody.replaceChildren()

    if (rows.length === 0) {
      const emptyRow = document.createElement('tr')
      emptyRow.className = 'ml-ex-ui-measure-empty-row'
      const cell = document.createElement('td')
      cell.colSpan = 3
      cell.textContent = this.i18n.t('measurePalette.empty')
      emptyRow.appendChild(cell)
      this.tbody.appendChild(emptyRow)
      return
    }

    const deleteLabel = this.i18n.t('measurePalette.delete')
    for (const record of rows) {
      const tr = document.createElement('tr')
      tr.className = 'ml-ex-ui-measure-row'
      tr.dataset.measureId = record.id
      if (record.id === this.selectedId) {
        tr.classList.add('is-selected')
      }

      const typeCell = document.createElement('td')
      typeCell.textContent = this.typeLabel(record.type)
      const valueCell = document.createElement('td')
      const value = getMeasurementValueText(record.id, db) || '—'
      valueCell.textContent = value
      valueCell.title = value

      const actionsCell = document.createElement('td')
      actionsCell.className = 'ml-ex-ui-measure-actions-col'
      const deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className =
        'ml-ex-ui-measure-btn ml-ex-ui-measure-btn-danger ml-ex-ui-measure-row-delete'
      deleteBtn.dataset.measureDelete = record.id
      deleteBtn.textContent = deleteLabel
      deleteBtn.title = deleteLabel
      deleteBtn.setAttribute('aria-label', deleteLabel)
      actionsCell.appendChild(deleteBtn)

      tr.append(typeCell, valueCell, actionsCell)
      this.tbody.appendChild(tr)
    }
  }

  /** Measurements matching the active type filter. */
  private filteredMeasurements() {
    if (!this.activeFilter) return this.measurements
    return this.measurements.filter(record => record.type === this.activeFilter)
  }

  /** Selects one type filter, or clears it when the same button is clicked. */
  private toggleFilter(type: AcUiMeasureFilterType) {
    this.activeFilter = this.activeFilter === type ? undefined : type
    for (const [filterType, button] of this.filterButtons) {
      const active = this.activeFilter === filterType
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }
    this.renderTable()
  }

  /** Selects a measurement and zooms the view to it. */
  private handleRowClick(id: string) {
    const record = this.measurements.find(item => item.id === id)
    const view = this.editor.curView
    if (!record || !view) return
    focusMeasurement(view, record)
  }

  /** Removes one measurement overlay. */
  private removeOne(id: string) {
    const view = this.editor.curView
    if (!view) return
    removeMeasurement(view, id)
  }

  /** Clears all measurements on the active layout. */
  private clearAll() {
    const view = this.editor.curView
    if (!view) return
    clearLayoutMeasurements(view)
  }

  /** Localized measurement type label, falling back to the raw type id. */
  private typeLabel(type: AcApMeasurementType) {
    const key = `measurePalette.typeValues.${type}`
    const label = this.i18n.t(key)
    return label === key ? type : label
  }
}
