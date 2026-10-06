/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util'

Object.assign(globalThis, { TextDecoder, TextEncoder })

import {
  acuiClearAciPanelViewportPin,
  acuiCreateAciIndexPicker,
  acuiCreateAciPaletteStacks,
  acuiParseAciManualInput,
  acuiPinAciPanelToViewportWidth,
  ML_ACI_STACKS_FILL_CLASS
} from '../src/ui/AcUiAciPaletteUi'
import {
  ACI_GRAY_PALETTE_INDICES,
  ACI_LARGE_PALETTE_INDICES,
  ACI_SMALL_PALETTE_INDICES
} from '../src/util/AcApAciPalette'

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? 'mouse'
  }
}

Object.assign(globalThis, { PointerEvent: TestPointerEvent })

function dispatchPointer(
  target: Element,
  type: string,
  init: Partial<PointerEventInit> & { clientX: number; clientY: number }
) {
  target.dispatchEvent(
    new TestPointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      ...init
    })
  )
}

describe('AcUiAciPaletteUi', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-aci-palette-styles')?.remove()
    document.querySelectorAll('.ml-aci-loupe').forEach(el => el.remove())
    jest.useRealTimers()
  })

  it('builds stacks with 240+9+6 cells in AutoCAD order', () => {
    const stacks = acuiCreateAciPaletteStacks({ onSelect: () => undefined })
    document.body.appendChild(stacks.root)

    const cells = [
      ...stacks.root.querySelectorAll<HTMLElement>('.ml-aci-cell')
    ]
    expect(cells).toHaveLength(255)
    expect(cells.map(c => Number(c.dataset.aci))).toEqual([
      ...ACI_LARGE_PALETTE_INDICES,
      ...ACI_SMALL_PALETTE_INDICES,
      ...ACI_GRAY_PALETTE_INDICES
    ])
  })

  it('selects on pointer tap without showing the loupe', () => {
    const onSelect = jest.fn()
    const stacks = acuiCreateAciPaletteStacks({ onSelect, selectedIndex: 1 })
    document.body.appendChild(stacks.root)

    expect(
      stacks.root
        .querySelector('.ml-aci-cell[data-aci="1"]')
        ?.classList.contains('is-selected')
    ).toBe(true)

    const cell = stacks.root.querySelector(
      '.ml-aci-cell[data-aci="18"]'
    ) as HTMLButtonElement

    dispatchPointer(cell, 'pointerdown', { clientX: 12, clientY: 12 })
    dispatchPointer(cell, 'pointerup', { clientX: 12, clientY: 12 })

    expect(onSelect).toHaveBeenCalledWith(18, expect.any(TestPointerEvent))
    expect(cell.classList.contains('is-selected')).toBe(true)
    expect(document.querySelector('.ml-aci-loupe.is-visible')).toBeNull()

    stacks.setSelected(undefined)
    expect(cell.classList.contains('is-selected')).toBe(false)
  })

  it('shows a loupe on long-press and selects the cell under the pointer on release', () => {
    jest.useFakeTimers()
    const onSelect = jest.fn()
    const stacks = acuiCreateAciPaletteStacks({ onSelect })
    document.body.appendChild(stacks.root)

    const start = stacks.root.querySelector(
      '.ml-aci-cell[data-aci="18"]'
    ) as HTMLButtonElement
    const next = stacks.root.querySelector(
      '.ml-aci-cell[data-aci="28"]'
    ) as HTMLButtonElement

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: (x: number) => (x >= 100 ? next : start)
    })

    dispatchPointer(start, 'pointerdown', { clientX: 10, clientY: 10 })
    expect(document.querySelector('.ml-aci-loupe.is-visible')).toBeNull()

    jest.advanceTimersByTime(350)
    const loupe = document.querySelector('.ml-aci-loupe') as HTMLElement
    expect(loupe.classList.contains('is-visible')).toBe(true)
    expect(loupe.querySelector('.ml-aci-loupe__label')?.textContent).toBe('18')
    expect(start.classList.contains('is-preview')).toBe(true)

    dispatchPointer(stacks.root, 'pointermove', { clientX: 120, clientY: 10 })
    expect(loupe.querySelector('.ml-aci-loupe__label')?.textContent).toBe('28')
    expect(next.classList.contains('is-preview')).toBe(true)

    dispatchPointer(stacks.root, 'pointerup', { clientX: 120, clientY: 10 })
    expect(onSelect).toHaveBeenCalledWith(28, expect.any(TestPointerEvent))
    expect(loupe.classList.contains('is-visible')).toBe(false)

    stacks.dispose()
  })

  it('selects a cell from keyboard-synthesized click without a pointer gesture', () => {
    const onSelect = jest.fn()
    const stacks = acuiCreateAciPaletteStacks({ onSelect })
    document.body.appendChild(stacks.root)

    const cell = stacks.root.querySelector(
      '.ml-aci-cell[data-aci="18"]'
    ) as HTMLButtonElement
    cell.click()

    expect(onSelect).toHaveBeenCalledWith(18, expect.any(MouseEvent))
    expect(cell.classList.contains('is-selected')).toBe(true)
    stacks.dispose()
  })

  it('builds a full index picker with ByLayer / ByBlock and input', () => {
    const onChange = jest.fn()
    const picker = acuiCreateAciIndexPicker({
      labels: {
        index: 'Index: ',
        rgb: 'RGB: ',
        input: 'Color',
        inputPlaceholder: '1-255'
      },
      initialIndex: 7,
      onChange
    })
    document.body.appendChild(picker.root)

    expect(picker.getIndex()).toBe(7)
    expect(picker.root.querySelectorAll('.ml-aci-cell')).toHaveLength(255)

    const byLayer = [...picker.root.querySelectorAll('button')].find(
      b => b.textContent === 'ByLayer'
    )
    byLayer?.click()
    expect(picker.getIndex()).toBe(256)
    expect(onChange).toHaveBeenCalledWith(256)

    picker.setIndex(3)
    expect(picker.getIndex()).toBe(3)
    picker.dispose()
  })

  it('omits ByLayer / ByBlock when showByLayerByBlock is false', () => {
    const picker = acuiCreateAciIndexPicker({
      labels: {
        index: 'Index: ',
        rgb: 'RGB: ',
        input: 'Color',
        inputPlaceholder: '1-255'
      },
      initialIndex: 7,
      showByLayerByBlock: false
    })
    document.body.appendChild(picker.root)

    expect(picker.root.classList.contains('ml-aci-picker--no-special')).toBe(
      true
    )
    expect(
      [...picker.root.querySelectorAll('button')].map(b => b.textContent)
    ).not.toEqual(expect.arrayContaining(['ByLayer', 'ByBlock']))
    expect(picker.root.querySelector('.ml-aci-preview-box')).toBeTruthy()
    expect(picker.root.querySelector('.ml-aci-input-row input')).toBeTruthy()

    picker.dispose()
  })

  it('parses manual ACI input', () => {
    expect(acuiParseAciManualInput('BYLAYER')).toBe(256)
    expect(acuiParseAciManualInput('byblock')).toBe(0)
    expect(acuiParseAciManualInput('42')).toBe(42)
    expect(acuiParseAciManualInput('999')).toBeNull()
    expect(acuiParseAciManualInput('nope')).toBeNull()
  })

  it('toggles fill layout for even 24-column distribution', () => {
    const stacks = acuiCreateAciPaletteStacks({
      onSelect: () => undefined,
      fill: true
    })
    expect(stacks.root.classList.contains(ML_ACI_STACKS_FILL_CLASS)).toBe(true)
    expect(stacks.root.querySelectorAll('.ml-aci-palette')).toHaveLength(3)

    stacks.setFill(false)
    expect(stacks.root.classList.contains(ML_ACI_STACKS_FILL_CLASS)).toBe(false)
    stacks.dispose()
  })

  it('pins a drop-up popover to the viewport width', () => {
    const anchor = document.createElement('div')
    const panel = document.createElement('div')
    document.body.append(anchor, panel)
    jest.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      x: 40,
      y: 400,
      left: 40,
      top: 400,
      width: 28,
      height: 28,
      right: 68,
      bottom: 428,
      toJSON: () => ({})
    } as DOMRect)
    const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth')
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390
    })

    acuiPinAciPanelToViewportWidth(panel, anchor)
    expect(panel.style.left).toBe('-40px')
    expect(panel.style.width).toBe('390px')
    expect(panel.style.bottom).toBe('34px')
    expect(panel.style.boxSizing).toBe('border-box')

    acuiClearAciPanelViewportPin(panel)
    expect(panel.style.left).toBe('')
    expect(panel.style.width).toBe('')

    if (widthDescriptor) {
      Object.defineProperty(window, 'innerWidth', widthDescriptor)
    } else {
      delete (window as { innerWidth?: number }).innerWidth
    }
  })
})
