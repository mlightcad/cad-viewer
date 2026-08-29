/** @jest-environment jsdom */

import type { AcApMeasurementRecord } from '@mlightcad/cad-simple-viewer'

const records: AcApMeasurementRecord[] = []
let selectedId: string | undefined
let listListener: (() => void) | undefined
let selectionListener: (() => void) | undefined

const mockView = { id: 'view', activeLayoutBtrId: 'layout-a' }
const valueById = new Map<string, string>()

const mockFocus = jest.fn()
const mockRemove = jest.fn((_view: unknown, id: string) => {
  const index = records.findIndex(item => item.id === id)
  if (index !== -1) records.splice(index, 1)
  if (selectedId === id) selectedId = undefined
  listListener?.()
  selectionListener?.()
})
const mockClear = jest.fn((_view?: unknown) => {
  records.length = 0
  selectedId = undefined
  listListener?.()
  selectionListener?.()
})

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      curView: mockView,
      curDocument: { database: {} }
    }
  },
  AcApI18n: {
    t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key,
    mergeLocaleMessage: jest.fn()
  },
  listLayoutMeasurements: () =>
    records.filter(
      record =>
        record.layoutId == null || record.layoutId === mockView.activeLayoutBtrId
    ),
  getMeasurementValueText: (id: string) => valueById.get(id) ?? '',
  getSelectedMeasurementId: () => selectedId,
  subscribeMeasurements: (listener: () => void) => {
    listListener = listener
    return () => {
      listListener = undefined
    }
  },
  subscribeMeasurementSelection: (listener: () => void) => {
    selectionListener = listener
    return () => {
      selectionListener = undefined
    }
  },
  focusMeasurement: (...args: unknown[]) => mockFocus(...args),
  removeMeasurement: (view: unknown, id: string) => mockRemove(view, id),
  clearLayoutMeasurements: (view: unknown) => mockClear(view)
}))

import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import { AcUiI18n, acuiRegisterSimpleUiI18n } from '../src/i18n'
import { AcUiMeasurementPaletteView } from '../src/ui/AcUiMeasurementPaletteView'

function createRecord(
  overrides: Partial<AcApMeasurementRecord> & Pick<AcApMeasurementRecord, 'id'>
): AcApMeasurementRecord {
  return {
    type: 'distance',
    style: { color: '#ff0000', lineWeight: 0, fontSize: 12 },
    geometry: {
      type: 'distance',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 }
    },
    ...overrides
  }
}

function createView() {
  acuiRegisterSimpleUiI18n()
  return new AcUiMeasurementPaletteView({
    editor: AcApDocManager.instance,
    i18n: new AcUiI18n()
  })
}

describe('AcUiMeasurementPaletteView', () => {
  beforeEach(() => {
    records.length = 0
    selectedId = undefined
    listListener = undefined
    selectionListener = undefined
    mockView.activeLayoutBtrId = 'layout-a'
    valueById.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('shows an empty state when there are no measurements', () => {
    const view = createView()
    expect(
      view.element.querySelector('.ml-ex-ui-measure-empty-row')?.textContent
    ).toBe('measurePalette.empty')
    expect(
      (view.element.querySelector('.ml-ex-ui-measure-btn') as HTMLButtonElement)
        .disabled
    ).toBe(true)
    view.destroy()
  })

  it('lists measurements, zooms on click, deletes one, and clears all', () => {
    records.push(
      createRecord({ id: 'd1' }),
      createRecord({
        id: 'a1',
        type: 'angle',
        geometry: {
          type: 'angle',
          vertex: { x: 0, y: 0 },
          arm1: { x: 1, y: 0 },
          arm2: { x: 0, y: 1 }
        }
      })
    )
    valueById.set('d1', '12.5')
    valueById.set('a1', '90°')

    const view = createView()
    document.body.appendChild(view.element)

    expect(view.element.querySelectorAll('.ml-ex-ui-measure-row')).toHaveLength(2)
    expect(
      view.element.querySelectorAll('[data-measure-filter]')
    ).toHaveLength(4)

    const angleFilter = view.element.querySelector(
      '[data-measure-filter="angle"]'
    ) as HTMLButtonElement
    angleFilter.click()
    expect(angleFilter.getAttribute('aria-pressed')).toBe('true')
    expect(view.element.querySelectorAll('.ml-ex-ui-measure-row')).toHaveLength(1)
    expect(
      view.element.querySelector('.ml-ex-ui-measure-row')?.textContent
    ).toContain('90°')

    angleFilter.click()
    expect(angleFilter.getAttribute('aria-pressed')).toBe('false')
    expect(view.element.querySelectorAll('.ml-ex-ui-measure-row')).toHaveLength(2)

    const firstRow = view.element.querySelector(
      '[data-measure-id="d1"]'
    ) as HTMLTableRowElement
    firstRow.click()
    expect(mockFocus).toHaveBeenCalledWith(
      mockView,
      expect.objectContaining({ id: 'd1' })
    )

    const deleteBtn = view.element.querySelector(
      '[data-measure-delete="a1"]'
    ) as HTMLButtonElement
    deleteBtn.click()
    expect(mockRemove).toHaveBeenCalledWith(mockView, 'a1')
    expect(view.element.querySelectorAll('.ml-ex-ui-measure-row')).toHaveLength(1)

    const clearBtn = view.element.querySelector(
      '.ml-ex-ui-measure-toolbar .ml-ex-ui-measure-btn'
    ) as HTMLButtonElement
    clearBtn.click()
    expect(mockClear).toHaveBeenCalledWith(mockView)
    expect(
      view.element.querySelector('.ml-ex-ui-measure-empty-row')
    ).toBeTruthy()

    view.destroy()
  })

  it('rebuilds rows when the active layout changes', () => {
    records.push(
      createRecord({ id: 'on-a', layoutId: 'layout-a' }),
      createRecord({ id: 'on-b', layoutId: 'layout-b' })
    )
    valueById.set('on-a', '10')
    valueById.set('on-b', '20')

    const view = createView()
    expect(view.element.querySelectorAll('.ml-ex-ui-measure-row')).toHaveLength(
      1
    )
    expect(view.element.querySelector('[data-measure-id="on-a"]')).toBeTruthy()

    mockView.activeLayoutBtrId = 'layout-b'
    listListener?.()

    expect(view.element.querySelectorAll('.ml-ex-ui-measure-row')).toHaveLength(
      1
    )
    expect(view.element.querySelector('[data-measure-id="on-b"]')).toBeTruthy()
    expect(view.element.querySelector('[data-measure-id="on-a"]')).toBeNull()

    view.destroy()
  })
})
