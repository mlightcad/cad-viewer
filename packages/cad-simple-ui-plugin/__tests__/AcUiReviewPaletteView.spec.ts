/** @jest-environment jsdom */

import type { AcApMarkupRecord } from '@mlightcad/cad-simple-viewer'

const records: AcApMarkupRecord[] = []
let selectedId: string | undefined
let storeListener: (() => void) | undefined

const mockView = { id: 'view' }

const mockStore = {
  list: () => [...records],
  get selectedId() {
    return selectedId
  },
  subscribe: (listener: () => void) => {
    storeListener = listener
    return () => {
      storeListener = undefined
    }
  },
  updateMeta: jest.fn(
    (
      id: string,
      patch: Partial<Pick<AcApMarkupRecord, 'comment' | 'status' | 'text'>>
    ) => {
      const record = records.find(item => item.id === id)
      if (!record) return undefined
      Object.assign(record, patch)
      storeListener?.()
      return record
    }
  )
}

const mockPresenter = {
  select: jest.fn((_view: unknown, id: string) => {
    if (selectedId === id) return
    selectedId = id
    storeListener?.()
  }),
  focus: jest.fn(),
  unpublish: jest.fn((_view: unknown, id: string) => {
    const index = records.findIndex(item => item.id === id)
    if (index !== -1) records.splice(index, 1)
    if (selectedId === id) selectedId = undefined
    storeListener?.()
  }),
  publish: jest.fn(),
  clearVisuals: jest.fn(() => {
    records.length = 0
    selectedId = undefined
    storeListener?.()
  })
}

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      curView: mockView
    }
  },
  AcApI18n: {
    t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key,
    mergeLocaleMessage: jest.fn()
  },
  getMarkupStore: () => mockStore,
  getMarkupPresenter: () => mockPresenter,
  runMarkupEdit: (_view: unknown, _label: string, mutate: () => void) => {
    mutate()
  },
  MARKUP_STATUSES: ['open', 'question', 'answered', 'closed']
}))

import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import { AcUiI18n, acuiRegisterSimpleUiI18n } from '../src/i18n'
import { AcUiReviewPaletteView } from '../src/ui/AcUiReviewPaletteView'

function createRecord(
  overrides: Partial<AcApMarkupRecord> & Pick<AcApMarkupRecord, 'id' | 'type'>
): AcApMarkupRecord {
  return {
    style: { color: '#ff0000' },
    comment: '',
    status: 'open',
    author: 'tester',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    geometry: { type: 'text', position: { x: 0, y: 0 } },
    ...overrides
  } as AcApMarkupRecord
}

function createView() {
  acuiRegisterSimpleUiI18n()
  return new AcUiReviewPaletteView({
    editor: AcApDocManager.instance,
    i18n: new AcUiI18n()
  })
}

describe('AcUiReviewPaletteView', () => {
  beforeEach(() => {
    records.length = 0
    selectedId = undefined
    storeListener = undefined
    jest.clearAllMocks()
  })

  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('shows an empty state when there are no markups', () => {
    const view = createView()
    expect(view.element.querySelector('.ml-ex-ui-review-empty-row')?.textContent)
      .toBe('reviewPalette.empty')
    expect(
      (view.element.querySelector('.ml-ex-ui-review-toolbar button') as HTMLButtonElement)
        .disabled
    ).toBe(true)
    view.destroy()
  })

  it('lists markups, filters by search, and opens details on row click', () => {
    records.push(
      createRecord({
        id: 'cloud-1',
        type: 'cloud',
        author: 'alice',
        text: 'Need revision',
        comment: 'check dims'
      }),
      createRecord({
        id: 'text-1',
        type: 'text',
        author: 'bob',
        text: 'OK'
      })
    )

    const view = createView()
    document.body.appendChild(view.element)

    expect(view.element.querySelectorAll('.ml-ex-ui-review-row')).toHaveLength(2)

    const search = view.element.querySelector(
      '.ml-ex-ui-review-search'
    ) as HTMLInputElement
    search.value = 'alice'
    search.dispatchEvent(new Event('input'))
    expect(view.element.querySelectorAll('.ml-ex-ui-review-row')).toHaveLength(1)
    expect(
      view.element.querySelector('.ml-ex-ui-review-row')?.textContent
    ).toContain('alice')

    search.value = ''
    search.dispatchEvent(new Event('input'))

    const firstRow = view.element.querySelector(
      '[data-markup-id="cloud-1"]'
    ) as HTMLTableRowElement
    firstRow.click()

    expect(mockPresenter.select).toHaveBeenCalledWith(mockView, 'cloud-1')
    expect(
      view.element.querySelector('.ml-ex-ui-review-detail')?.hasAttribute('hidden')
    ).toBe(false)
    expect(
      (view.element.querySelector('.ml-ex-ui-review-input:not([disabled])') as HTMLInputElement)
        .value
    ).toBe('Need revision')

    const closeDetails = view.element.querySelector(
      '.ml-ex-ui-review-detail-close'
    ) as HTMLButtonElement
    closeDetails.click()
    expect(
      view.element.querySelector('.ml-ex-ui-review-detail')?.hasAttribute('hidden')
    ).toBe(true)

    firstRow.click()
    expect(firstRow.isConnected).toBe(true)
    firstRow.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(mockPresenter.focus).toHaveBeenCalledWith(
      mockView,
      expect.objectContaining({ id: 'cloud-1' })
    )

    view.destroy()
  })

  it('updates status, zooms, deletes, and clears markups', () => {
    records.push(
      createRecord({
        id: 'cloud-1',
        type: 'cloud',
        text: 'Need revision'
      })
    )
    selectedId = 'cloud-1'

    const view = createView()
    document.body.appendChild(view.element)

    const statusSelect = view.element.querySelector(
      '.ml-ex-ui-review-select'
    ) as HTMLSelectElement
    statusSelect.value = 'closed'
    statusSelect.dispatchEvent(new Event('change'))
    expect(mockStore.updateMeta).toHaveBeenCalledWith('cloud-1', {
      status: 'closed'
    })

    const buttons = Array.from(
      view.element.querySelectorAll('.ml-ex-ui-review-detail-actions button')
    ) as HTMLButtonElement[]
    buttons[0].click()
    expect(mockPresenter.focus).toHaveBeenCalledWith(
      mockView,
      expect.objectContaining({ id: 'cloud-1' })
    )

    buttons[1].click()
    expect(mockPresenter.unpublish).toHaveBeenCalledWith(mockView, 'cloud-1')
    expect(view.element.querySelector('.ml-ex-ui-review-empty-row')).not.toBeNull()

    records.push(createRecord({ id: 'text-1', type: 'text', text: 'keep' }))
    storeListener?.()

    const clearButton = view.element.querySelector(
      '.ml-ex-ui-review-toolbar button'
    ) as HTMLButtonElement
    clearButton.click()
    expect(mockPresenter.clearVisuals).toHaveBeenCalledWith(mockView, {
      clearStore: true
    })
    expect(view.element.querySelectorAll('.ml-ex-ui-review-row')).toHaveLength(0)

    view.destroy()
  })
})
