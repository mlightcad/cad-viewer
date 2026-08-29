/**
 * Review / markup list drawer for the offline HTML viewer.
 *
 * Mirrors cad-simple-ui-plugin's review palette: search, table, details,
 * zoom-to, delete, and clear-all.
 *
 * @module AcExHtmlReviewPanel
 * @packageDocumentation
 */

import type { AcExHtmlI18n } from './AcExHtmlI18n'
import type { AcExMarkupController } from './AcExMarkup'
import type {
  AcExMarkupRecord,
  AcExMarkupStatus,
  AcExMarkupType
} from './AcExMarkupTypes'

const STATUSES: readonly AcExMarkupStatus[] = [
  'open',
  'question',
  'answered',
  'closed'
]

const TYPE_I18N: Partial<Record<AcExMarkupType, string>> = {
  cloud: 'toolbar.markupCloud',
  callout: 'toolbar.markupCallout',
  text: 'toolbar.markupText',
  rect: 'toolbar.markupRect',
  circle: 'toolbar.markupCircle',
  arrow: 'toolbar.markupArrow',
  stamp: 'toolbar.markupStamp'
}

/** Handles returned by {@link setupAcExHtmlReviewPanel}. */
export interface AcExHtmlReviewPanelController {
  /** Re-render labels after a locale change. */
  refreshLabels: () => void
  /** Close the drawer. */
  close: () => void
  /** Open or close the drawer. */
  setOpen: (open: boolean) => void
}

/**
 * Wires the review drawer to the markup controller.
 *
 * @returns Controller, or `null` when the shell markup is missing.
 */
export function setupAcExHtmlReviewPanel(options: {
  i18n: AcExHtmlI18n
  getMarkup: () => AcExMarkupController | null
  closeOtherDrawers: () => void
  /** Phone: park the drawer and dismiss open strips. */
  onPhoneOpen?: (drawer: HTMLElement) => void
}): AcExHtmlReviewPanelController | null {
  const { i18n, getMarkup, closeOtherDrawers, onPhoneOpen } = options
  const drawer = document.getElementById('mlcad-review-drawer')
  const closeBtn = document.getElementById('mlcad-review-close')
  const sheetCloseBtn = drawer?.querySelector('.mlcad-drawer-sheet-close')
  if (!drawer) return null

  const searchInput = drawer.querySelector(
    '.mlcad-review-search'
  ) as HTMLInputElement | null
  const clearBtn = drawer.querySelector(
    '.mlcad-review-clear'
  ) as HTMLButtonElement | null
  const tbody = drawer.querySelector('tbody')
  const detail = drawer.querySelector(
    '.mlcad-review-detail'
  ) as HTMLDivElement | null
  const statusSelect = drawer.querySelector(
    '.mlcad-review-status'
  ) as HTMLSelectElement | null
  const authorInput = drawer.querySelector(
    '.mlcad-review-author'
  ) as HTMLInputElement | null
  const textInput = drawer.querySelector(
    '.mlcad-review-text'
  ) as HTMLInputElement | null
  const commentInput = drawer.querySelector(
    '.mlcad-review-comment'
  ) as HTMLTextAreaElement | null
  const zoomBtn = drawer.querySelector(
    '.mlcad-review-zoom'
  ) as HTMLButtonElement | null
  const deleteBtn = drawer.querySelector(
    '.mlcad-review-delete'
  ) as HTMLButtonElement | null
  const closeDetailsBtn = drawer.querySelector(
    '.mlcad-review-detail-close'
  ) as HTMLButtonElement | null
  if (
    !searchInput ||
    !clearBtn ||
    !tbody ||
    !detail ||
    !statusSelect ||
    !authorInput ||
    !textInput ||
    !commentInput ||
    !zoomBtn ||
    !deleteBtn ||
    !closeDetailsBtn
  ) {
    return null
  }

  let detailsOpen = true
  let unsubscribe: (() => void) | undefined

  const typeLabel = (type: AcExMarkupType) => {
    const key = TYPE_I18N[type]
    return key ? i18n.t(key as 'toolbar.markupCloud') : type
  }

  const statusLabel = (status: AcExMarkupStatus) =>
    i18n.t(`review.statusValues.${status}` as 'review.statusValues.open')

  const rebuildStatusOptions = () => {
    const current = statusSelect.value
    statusSelect.replaceChildren()
    for (const status of STATUSES) {
      const option = document.createElement('option')
      option.value = status
      option.textContent = statusLabel(status)
      statusSelect.appendChild(option)
    }
    if (current) statusSelect.value = current
  }

  const selectedRecord = (): AcExMarkupRecord | undefined => {
    const markup = getMarkup()
    if (!markup) return undefined
    const id = markup.selectedId
    if (!id) return undefined
    return markup.list().find(record => record.id === id)
  }

  const renderTable = () => {
    const markup = getMarkup()
    const records = markup?.list() ?? []
    const selectedId = markup?.selectedId
    const query = searchInput.value.trim().toLowerCase()
    const rows = query
      ? records.filter(record => {
          const hay = `${record.type} ${record.status} ${record.author} ${record.text ?? ''} ${record.comment}`
          return hay.toLowerCase().includes(query)
        })
      : records

    tbody.replaceChildren()
    clearBtn.disabled = records.length === 0

    if (rows.length === 0) {
      const emptyRow = document.createElement('tr')
      emptyRow.className = 'mlcad-review-empty'
      const cell = document.createElement('td')
      cell.colSpan = 4
      cell.textContent = i18n.t('review.empty')
      emptyRow.appendChild(cell)
      tbody.appendChild(emptyRow)
      return
    }

    for (const record of rows) {
      const tr = document.createElement('tr')
      tr.dataset.markupId = record.id
      if (record.id === selectedId) tr.classList.add('is-selected')

      const typeCell = document.createElement('td')
      typeCell.textContent = typeLabel(record.type)
      const statusCell = document.createElement('td')
      statusCell.textContent = statusLabel(record.status)
      const authorCell = document.createElement('td')
      authorCell.textContent = record.author
      authorCell.title = record.author
      const summaryCell = document.createElement('td')
      const summary = record.text || record.comment || '—'
      summaryCell.textContent = summary
      summaryCell.title = summary
      tr.append(typeCell, statusCell, authorCell, summaryCell)
      tbody.appendChild(tr)
    }
  }

  const updateDetail = () => {
    const selected = selectedRecord()
    const show = Boolean(selected && detailsOpen)
    detail.hidden = !show
    if (!selected || !show) return
    statusSelect.value = selected.status
    authorInput.value = selected.author
    if (document.activeElement !== textInput) {
      textInput.value = selected.text ?? ''
    }
    if (document.activeElement !== commentInput) {
      commentInput.value = selected.comment ?? ''
    }
  }

  const recordsKey = (records: readonly AcExMarkupRecord[]) =>
    records
      .map(
        record =>
          `${record.id}\t${record.type}\t${record.status}\t${record.author}\t${record.text ?? ''}\t${record.comment}`
      )
      .join('\n')

  let tableContentKey = ''

  const syncRowSelection = () => {
    const selectedId = getMarkup()?.selectedId
    tbody.querySelectorAll('tr[data-markup-id]').forEach(row => {
      row.classList.toggle('is-selected', row.getAttribute('data-markup-id') === selectedId)
    })
  }

  const refresh = () => {
    const records = getMarkup()?.list() ?? []
    const key = recordsKey(records)
    if (
      key === tableContentKey &&
      tbody.querySelector('tr[data-markup-id], .mlcad-review-empty')
    ) {
      syncRowSelection()
    } else {
      tableContentKey = key
      renderTable()
    }
    updateDetail()
  }

  const rowMarkupId = (event: Event): string | undefined => {
    const target = event.target
    if (!(target instanceof Element)) return undefined
    const row = target.closest('tr[data-markup-id]')
    if (!row || !tbody.contains(row)) return undefined
    return row instanceof HTMLElement ? row.dataset.markupId : undefined
  }

  tbody.addEventListener('click', event => {
    const id = rowMarkupId(event)
    if (!id) return
    detailsOpen = true
    getMarkup()?.selectFromPanel(id)
    updateDetail()
  })
  tbody.addEventListener('dblclick', event => {
    const id = rowMarkupId(event)
    if (!id) return
    detailsOpen = true
    getMarkup()?.focus(id)
    updateDetail()
  })

  const setOpen = (open: boolean) => {
    if (open) {
      closeOtherDrawers()
      onPhoneOpen?.(drawer)
    }
    drawer.hidden = !open
    document
      .querySelectorAll('[data-action="markup-panel"]')
      .forEach(btn => {
        btn.classList.toggle('active', open)
        btn.setAttribute('aria-pressed', String(open))
      })
    if (open) {
      const markup = getMarkup()
      unsubscribe?.()
      unsubscribe = markup?.subscribe(refresh)
      refresh()
    } else {
      unsubscribe?.()
      unsubscribe = undefined
    }
  }

  searchInput.addEventListener('input', () => renderTable())
  clearBtn.addEventListener('click', () => getMarkup()?.clearAll())
  closeBtn?.addEventListener('click', () => setOpen(false))
  sheetCloseBtn?.addEventListener('click', () => setOpen(false))

  statusSelect.addEventListener('change', () => {
    const selected = selectedRecord()
    if (!selected) return
    getMarkup()?.updateMeta(selected.id, {
      status: statusSelect.value as AcExMarkupStatus
    })
  })
  textInput.addEventListener('blur', () => {
    const selected = selectedRecord()
    if (!selected) return
    const next = textInput.value
    if (next === (selected.text ?? '')) return
    getMarkup()?.updateMeta(selected.id, { text: next })
  })
  commentInput.addEventListener('blur', () => {
    const selected = selectedRecord()
    if (!selected) return
    const next = commentInput.value
    if (next === selected.comment) return
    getMarkup()?.updateMeta(selected.id, { comment: next })
  })
  zoomBtn.addEventListener('click', () => {
    const selected = selectedRecord()
    if (selected) getMarkup()?.focus(selected.id)
  })
  deleteBtn.addEventListener('click', () => {
    const selected = selectedRecord()
    if (selected) getMarkup()?.removeMarkup(selected.id)
  })
  closeDetailsBtn.addEventListener('click', () => {
    detailsOpen = false
    updateDetail()
  })

  const refreshLabels = () => {
    searchInput.placeholder = i18n.t('review.searchPlaceholder')
    clearBtn.textContent = i18n.t('review.clear')
    const typeHeader = drawer.querySelector('[data-review-col="type"]')
    const statusHeader = drawer.querySelector('[data-review-col="status"]')
    const authorHeader = drawer.querySelector('[data-review-col="author"]')
    const summaryHeader = drawer.querySelector('[data-review-col="summary"]')
    if (typeHeader) typeHeader.textContent = i18n.t('review.type')
    if (statusHeader) statusHeader.textContent = i18n.t('review.status')
    if (authorHeader) authorHeader.textContent = i18n.t('review.author')
    if (summaryHeader) summaryHeader.textContent = i18n.t('review.summary')
    const detailTitle = drawer.querySelector('.mlcad-review-detail-title')
    if (detailTitle) detailTitle.textContent = i18n.t('review.details')
    const closeDetailsLabel = i18n.t('review.closeDetails')
    closeDetailsBtn.title = closeDetailsLabel
    closeDetailsBtn.setAttribute('aria-label', closeDetailsLabel)
    const statusField = drawer.querySelector('[data-review-field="status"]')
    const authorField = drawer.querySelector('[data-review-field="author"]')
    const labelField = drawer.querySelector('[data-review-field="label"]')
    const commentField = drawer.querySelector('[data-review-field="comment"]')
    if (statusField) statusField.textContent = i18n.t('review.status')
    if (authorField) authorField.textContent = i18n.t('review.author')
    if (labelField) labelField.textContent = i18n.t('review.label')
    if (commentField) commentField.textContent = i18n.t('review.comment')
    zoomBtn.textContent = i18n.t('review.zoomTo')
    deleteBtn.textContent = i18n.t('review.delete')
    rebuildStatusOptions()
    renderTable()
    updateDetail()
  }

  rebuildStatusOptions()
  refreshLabels()

  return {
    refreshLabels,
    close: () => setOpen(false),
    setOpen
  }
}
