/** @jest-environment jsdom */

import { AcExHtmlI18n } from '../src/AcExHtmlI18n'
import { setupAcExHtmlMeasurePanel } from '../src/AcExHtmlMeasurePanel'
import { buildAcExHtmlShellBody } from '../src/AcExHtmlShell'
import type { AcExMeasureController } from '../src/AcExMeasurement'
import type { AcExMeasurementType } from '../src/AcExMeasurementTypes'

describe('setupAcExHtmlMeasurePanel', () => {
  type ListItem = {
    id: string
    type: AcExMeasurementType
    valueText: string
  }

  const items: ListItem[] = []
  let selectedId: string | undefined
  let listener: (() => void) | undefined

  const measure = {
    list: () => items,
    get selectedId() {
      return selectedId
    },
    subscribe: (fn: () => void) => {
      listener = fn
      return () => {
        listener = undefined
      }
    },
    focus: jest.fn(),
    removeMeasurement: jest.fn((id: string) => {
      const index = items.findIndex(item => item.id === id)
      if (index !== -1) items.splice(index, 1)
      listener?.()
    }),
    clearAll: jest.fn(() => {
      items.length = 0
      listener?.()
    })
  } as unknown as AcExMeasureController

  beforeEach(() => {
    items.length = 0
    selectedId = undefined
    listener = undefined
    document.body.innerHTML = buildAcExHtmlShellBody('#000000', 'measure')
    jest.clearAllMocks()
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('filters the list by type and restores all when the same filter is toggled off', () => {
    items.push(
      { id: 'd1', type: 'distance', valueText: '12.5' },
      { id: 'a1', type: 'angle', valueText: '90°' }
    )

    const panel = setupAcExHtmlMeasurePanel({
      i18n: new AcExHtmlI18n('en'),
      getMeasure: () => measure,
      closeOtherDrawers: jest.fn()
    })
    expect(panel).not.toBeNull()
    panel?.setOpen(true)

    expect(document.querySelectorAll('tr[data-measure-id]')).toHaveLength(2)
    expect(document.querySelector('.mlcad-measure-search')).toBeNull()
    expect(document.querySelectorAll('[data-measure-filter]')).toHaveLength(4)

    const angleFilter = document.querySelector(
      '[data-measure-filter="angle"]'
    ) as HTMLButtonElement
    angleFilter.click()
    expect(angleFilter.getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelectorAll('tr[data-measure-id]')).toHaveLength(1)
    expect(document.querySelector('tr[data-measure-id]')?.textContent).toContain(
      '90°'
    )

    angleFilter.click()
    expect(angleFilter.getAttribute('aria-pressed')).toBe('false')
    expect(document.querySelectorAll('tr[data-measure-id]')).toHaveLength(2)
  })

  it('updates row highlight and layout-filtered rows when the controller notifies', () => {
    items.push(
      { id: 'd1', type: 'distance', valueText: '12.5' },
      { id: 'a1', type: 'angle', valueText: '90°' }
    )
    selectedId = 'd1'

    const panel = setupAcExHtmlMeasurePanel({
      i18n: new AcExHtmlI18n('en'),
      getMeasure: () => measure,
      closeOtherDrawers: jest.fn()
    })
    panel?.setOpen(true)

    expect(
      document
        .querySelector('tr[data-measure-id="d1"]')
        ?.classList.contains('is-selected')
    ).toBe(true)

    selectedId = 'a1'
    listener?.()
    expect(
      document
        .querySelector('tr[data-measure-id="a1"]')
        ?.classList.contains('is-selected')
    ).toBe(true)
    expect(
      document
        .querySelector('tr[data-measure-id="d1"]')
        ?.classList.contains('is-selected')
    ).toBe(false)

    items.splice(0, items.length, { id: 'a1', type: 'angle', valueText: '90°' })
    listener?.()
    expect(document.querySelectorAll('tr[data-measure-id]')).toHaveLength(1)
    expect(
      (document.querySelector('tr[data-measure-id]') as HTMLElement).dataset
        .measureId
    ).toBe('a1')
  })
})
