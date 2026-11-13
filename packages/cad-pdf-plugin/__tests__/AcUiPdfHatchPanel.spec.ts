/**
 * @jest-environment jsdom
 */
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  acedApplyUiTheme: jest.fn(),
  acedSubscribeUiTheme: () => () => {},
  resolveUiTheme: () => 'light'
}))
jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key
}))

import { tessellateHatchPattern } from '@mlightcad/pdf-renderer'

import { AcApPdfHatchSession } from '../src/AcApPdfHatchSession'
import {
  acapPdfRecoverHatches,
  type PdfHatchInput
} from '../src/pdfHatchRecover'
import type { PdfImportShapeItem } from '../src/pdfImportShapes'
import {
  AcUiPdfHatchPanel,
  type AcUiPdfHatchPanelOptions
} from '../src/ui/AcUiPdfHatchPanel'
import { patternLines, rect } from './helpers/pdfHatchTestUtils'

function input(): PdfHatchInput<string> {
  const outline = rect(0, 0, 80, 50)
  const items: PdfImportShapeItem[] = []
  const owners: string[] = []
  outline.forEach((p, i) => {
    items.push({
      shape: { kind: 'line', start: p, end: outline[(i + 1) % 4] },
      layerName: 'WALL'
    })
    owners.push(`wall${i}`)
  })
  tessellateHatchPattern([outline], patternLines('ANSI37', 2), 0).forEach(
    ([a, b], i) => {
      items.push({ shape: { kind: 'line', start: a, end: b }, layerName: 'H' })
      owners.push(`s${i}`)
    }
  )
  return { items, owners }
}

function mount(overrides: Partial<AcUiPdfHatchPanelOptions<string>> = {}) {
  const data = input()
  const recovery = acapPdfRecoverHatches(data)
  const session = new AcApPdfHatchSession({
    input: data,
    tolerance: recovery.tolerance,
    hatches: recovery.hatches.map(found => found.hatch)
  })
  const options: AcUiPdfHatchPanelOptions<string> = {
    session,
    onChange: jest.fn(),
    onFocusRow: jest.fn(),
    onHideStrokes: jest.fn(),
    onAddRegion: jest.fn(async () => 'noBoundary' as const),
    onClose: jest.fn(),
    ...overrides
  }
  const panel = new AcUiPdfHatchPanel(options)
  document.body.append(panel.element)
  return { panel, session, options, root: panel.element }
}

const $ = <T extends Element>(root: Element, selector: string) =>
  root.querySelector<T>(selector)!

describe('AcUiPdfHatchPanel', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  test('lists the hatches with their score and replaced entities', () => {
    const { root, session } = mount()

    const rows = root.querySelectorAll('.ml-pdfhatch-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('ANSI37')
    expect(rows[0].textContent).toContain('%')
    expect(rows[0].textContent).toContain(
      `"count":${session.rows[0].consumed.length}`
    )
    expect(rows[0].classList.contains('is-poor')).toBe(false)
  })

  test('selecting a row frames it and opens its editor', () => {
    const { root, options } = mount()

    $<HTMLElement>(root, '.ml-pdfhatch-row').click()

    expect(options.onFocusRow).toHaveBeenCalledWith(expect.anything(), true)
    expect($<HTMLSelectElement>(root, '.ml-pdfhatch-pattern').value).toBe(
      'predefined:ANSI37'
    )
    expect(Number($<HTMLInputElement>(root, '.ml-pdfhatch-size').value)).toBe(2)
  })

  test('switching the pattern refits and flags a poor match', () => {
    const { root, panel, options, session } = mount()
    panel.selectFirst()

    const select = $<HTMLSelectElement>(root, '.ml-pdfhatch-pattern')
    select.value = 'predefined:ANSI31'
    select.dispatchEvent(new Event('change'))

    expect(session.patternKey(session.rows[0])).toBe('predefined:ANSI31')
    expect(options.onChange).toHaveBeenCalled()
    expect($(root, '.ml-pdfhatch-row').classList.contains('is-poor')).toBe(true)
    expect(root.querySelector('.ml-pdfhatch-warning')).not.toBeNull()
  })

  test('size and angle are applied on change, auto fit restores them', () => {
    const { root, panel, session } = mount()
    panel.selectFirst()

    const size = $<HTMLInputElement>(root, '.ml-pdfhatch-size')
    size.value = '1'
    size.dispatchEvent(new Event('change'))
    expect(session.params(session.rows[0])?.size).toBe(1)

    $<HTMLButtonElement>(root, '.ml-pdfhatch-autofit').click()
    expect(session.params(session.rows[0])?.size).toBeCloseTo(2, 3)
  })

  test('unchecking a row disables Apply', () => {
    const { root } = mount()
    const apply = Array.from(root.querySelectorAll('button')).find(
      b => b.textContent === 'jig.pdfhatch.panel.apply'
    )!
    expect(apply.disabled).toBe(false)

    const include = $<HTMLInputElement>(root, '.ml-pdfhatch-include')
    include.checked = false
    include.dispatchEvent(new Event('change'))

    expect(apply.disabled).toBe(true)
  })

  test('reports why an area could not be added', async () => {
    const { root, options } = mount()

    $<HTMLButtonElement>(root, '.ml-pdfhatch-toolbar button').click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(options.onAddRegion).toHaveBeenCalled()
    expect(root.textContent).toContain('jig.pdfhatch.panel.noBoundary')
  })

  test('a failing pick clears the hint and enables Add area again', async () => {
    const { root } = mount({
      onAddRegion: jest.fn(async () => {
        throw new Error('prompt failed')
      })
    })
    const add = $<HTMLButtonElement>(root, '.ml-pdfhatch-toolbar button')

    add.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(add.disabled).toBe(false)
    expect(root.textContent).not.toContain('jig.pdfhatch.panel.picking')
  })

  test('Apply and Cancel close the panel', () => {
    const { root, options } = mount()
    const buttons = Array.from(
      root.querySelectorAll('.ml-pdfhatch-buttons button')
    )

    ;(buttons[0] as HTMLButtonElement).click()
    ;(buttons[1] as HTMLButtonElement).click()

    expect(options.onClose).toHaveBeenNthCalledWith(1, false)
    expect(options.onClose).toHaveBeenNthCalledWith(2, true)
  })
})
