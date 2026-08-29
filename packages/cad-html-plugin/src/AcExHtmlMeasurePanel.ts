/**
 * Measurement list drawer for the offline HTML viewer.
 *
 * Lists committed measurements, zooms to a row on click, and supports
 * per-item delete plus clear-all.
 *
 * @module AcExHtmlMeasurePanel
 * @packageDocumentation
 */

import type { AcExHtmlI18n, AcExHtmlMessageKey } from './AcExHtmlI18n'
import type { AcExMeasureController } from './AcExMeasurement'
import type { AcExMeasurementType } from './AcExMeasurementTypes'

const TYPE_I18N: Record<AcExMeasurementType, string> = {
  distance: 'toolbar.measureDistance',
  angle: 'toolbar.measureAngle',
  area: 'toolbar.measureArea',
  arc: 'toolbar.measureArc',
  point: 'toolbar.measureCoordinate'
}

const FILTER_TYPES = ['distance', 'arc', 'angle', 'area'] as const
type AcExMeasureFilterType = (typeof FILTER_TYPES)[number]

const FILTER_I18N: Record<AcExMeasureFilterType, AcExHtmlMessageKey> = {
  distance: 'measurePanel.filterDistance',
  arc: 'measurePanel.filterArc',
  angle: 'measurePanel.filterAngle',
  area: 'measurePanel.filterArea'
}

/** Handles returned by {@link setupAcExHtmlMeasurePanel}. */
export interface AcExHtmlMeasurePanelController {
  /** Re-render labels after a locale change. */
  refreshLabels: () => void
  /** Close the drawer. */
  close: () => void
  /** Open or close the drawer. */
  setOpen: (open: boolean) => void
}

/**
 * Wires the measurement drawer to the measure controller.
 *
 * @returns Controller, or `null` when the shell markup is missing.
 */
export function setupAcExHtmlMeasurePanel(options: {
  i18n: AcExHtmlI18n
  getMeasure: () => AcExMeasureController | null
  closeOtherDrawers: () => void
  /** Phone: park the drawer and dismiss open strips. */
  onPhoneOpen?: (drawer: HTMLElement) => void
}): AcExHtmlMeasurePanelController | null {
  const { i18n, getMeasure, closeOtherDrawers, onPhoneOpen } = options
  const drawer = document.getElementById('mlcad-measure-drawer')
  const closeBtn = document.getElementById('mlcad-measure-close')
  const sheetCloseBtn = drawer?.querySelector('.mlcad-drawer-sheet-close')
  if (!drawer) return null

  const filterGroup = drawer.querySelector('.mlcad-measure-filter')
  const filterButtons = Array.from(
    drawer.querySelectorAll<HTMLButtonElement>('[data-measure-filter]')
  )
  const clearBtn = drawer.querySelector(
    '.mlcad-measure-clear'
  ) as HTMLButtonElement | null
  const tbody = drawer.querySelector('tbody')
  if (!filterGroup || filterButtons.length === 0 || !clearBtn || !tbody) {
    return null
  }

  let unsubscribe: (() => void) | undefined
  let tableContentKey = ''
  let activeFilter: AcExMeasureFilterType | undefined

  const typeLabel = (type: AcExMeasurementType) =>
    i18n.t(TYPE_I18N[type] as 'toolbar.measureDistance')

  const isFilterType = (
    value: string | undefined
  ): value is AcExMeasureFilterType =>
    FILTER_TYPES.includes(value as AcExMeasureFilterType)

  const syncFilterButtons = () => {
    for (const button of filterButtons) {
      const type = button.dataset.measureFilter
      const active = isFilterType(type) && activeFilter === type
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }
  }

  const renderTable = () => {
    const measure = getMeasure()
    const records = measure?.list() ?? []
    const selectedId = measure?.selectedId
    const rows = activeFilter
      ? records.filter(record => record.type === activeFilter)
      : records

    tbody.replaceChildren()
    clearBtn.disabled = records.length === 0

    if (rows.length === 0) {
      const emptyRow = document.createElement('tr')
      emptyRow.className = 'mlcad-measure-empty'
      const cell = document.createElement('td')
      cell.colSpan = 3
      cell.textContent = i18n.t('measurePanel.empty')
      emptyRow.appendChild(cell)
      tbody.appendChild(emptyRow)
      return
    }

    const deleteLabel = i18n.t('measurePanel.delete')
    for (const record of rows) {
      const tr = document.createElement('tr')
      tr.dataset.measureId = record.id
      if (record.id === selectedId) tr.classList.add('is-selected')

      const typeCell = document.createElement('td')
      typeCell.textContent = typeLabel(record.type)
      const valueCell = document.createElement('td')
      const value = record.valueText || '—'
      valueCell.textContent = value
      valueCell.title = value
      const actionsCell = document.createElement('td')
      const deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className = 'mlcad-measure-row-delete'
      deleteBtn.dataset.measureDelete = record.id
      deleteBtn.textContent = deleteLabel
      deleteBtn.title = deleteLabel
      deleteBtn.setAttribute('aria-label', deleteLabel)
      actionsCell.appendChild(deleteBtn)
      tr.append(typeCell, valueCell, actionsCell)
      tbody.appendChild(tr)
    }
  }

  const recordsKey = () =>
    (getMeasure()?.list() ?? [])
      .map(record => `${record.id}\t${record.type}\t${record.valueText}`)
      .join('\n')

  const syncRowSelection = () => {
    const selectedId = getMeasure()?.selectedId
    tbody.querySelectorAll('tr[data-measure-id]').forEach(row => {
      row.classList.toggle(
        'is-selected',
        row.getAttribute('data-measure-id') === selectedId
      )
    })
  }

  const refresh = () => {
    const key = recordsKey()
    if (
      key === tableContentKey &&
      tbody.querySelector('tr[data-measure-id], .mlcad-measure-empty')
    ) {
      syncRowSelection()
      return
    }
    tableContentKey = key
    renderTable()
  }

  const rowMeasureId = (event: Event): string | undefined => {
    const target = event.target
    if (!(target instanceof Element)) return undefined
    const row = target.closest('tr[data-measure-id]')
    if (!row || !tbody.contains(row)) return undefined
    return row instanceof HTMLElement ? row.dataset.measureId : undefined
  }

  tbody.addEventListener('click', event => {
    const target = event.target
    if (target instanceof Element) {
      const deleteBtn = target.closest('button[data-measure-delete]')
      if (deleteBtn instanceof HTMLElement && tbody.contains(deleteBtn)) {
        const id = deleteBtn.dataset.measureDelete
        if (id) getMeasure()?.removeMeasurement(id)
        return
      }
    }
    const id = rowMeasureId(event)
    if (!id) return
    getMeasure()?.focus(id)
  })

  const setOpen = (open: boolean) => {
    if (open) {
      closeOtherDrawers()
      onPhoneOpen?.(drawer)
    }
    drawer.hidden = !open
    document.querySelectorAll('[data-action="measure-panel"]').forEach(btn => {
      btn.classList.toggle('active', open)
      btn.setAttribute('aria-pressed', String(open))
    })
    if (open) {
      const measure = getMeasure()
      unsubscribe?.()
      unsubscribe = measure?.subscribe(refresh)
      refresh()
    } else {
      unsubscribe?.()
      unsubscribe = undefined
    }
  }

  filterGroup.addEventListener('click', event => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('[data-measure-filter]')
    if (!(button instanceof HTMLElement) || !filterGroup.contains(button)) {
      return
    }
    const type = button.dataset.measureFilter
    if (!isFilterType(type)) return
    activeFilter = activeFilter === type ? undefined : type
    syncFilterButtons()
    renderTable()
  })
  clearBtn.addEventListener('click', () => getMeasure()?.clearAll())
  closeBtn?.addEventListener('click', () => setOpen(false))
  sheetCloseBtn?.addEventListener('click', () => setOpen(false))

  const refreshLabels = () => {
    filterGroup.setAttribute('aria-label', i18n.t('measurePanel.filterGroup'))
    for (const button of filterButtons) {
      const type = button.dataset.measureFilter
      if (!isFilterType(type)) continue
      const label = i18n.t(FILTER_I18N[type])
      button.textContent = label
      button.title = label
      button.setAttribute('aria-label', label)
    }
    clearBtn.textContent = i18n.t('measurePanel.clear')
    const typeHeader = drawer.querySelector('[data-measure-col="type"]')
    const valueHeader = drawer.querySelector('[data-measure-col="value"]')
    if (typeHeader) typeHeader.textContent = i18n.t('measurePanel.type')
    if (valueHeader) valueHeader.textContent = i18n.t('measurePanel.value')
    const title = drawer.querySelector('[data-i18n-key="measurePanel.title"]')
    if (title) title.textContent = i18n.t('measurePanel.title')
    renderTable()
  }

  refreshLabels()

  return {
    refreshLabels,
    close: () => setOpen(false),
    setOpen
  }
}
