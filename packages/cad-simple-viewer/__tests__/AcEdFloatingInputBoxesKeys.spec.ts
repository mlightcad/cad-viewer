/** @jest-environment jsdom */

import { AcEdFloatingInputBoxes } from '../src/editor/input/ui/AcEdFloatingInputBoxes'
import { AcEdFloatingInputRawData } from '../src/editor/input/ui/AcEdFloatingInputTypes'

type Pointish = { x: number }

function press(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true
  })
  target.dispatchEvent(event)
  return event
}

function validate(raw: AcEdFloatingInputRawData) {
  const x = Number(raw.x)
  return Number.isFinite(x)
    ? { isValid: true, value: { x } as Pointish }
    : { isValid: false }
}

describe('AcEdFloatingInputBoxes key routing', () => {
  let onLetter: jest.Mock
  let committed: Pointish[]

  function createBoxes() {
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const boxes = new AcEdFloatingInputBoxes<Pointish>({
      parent,
      twoInputs: false,
      autoFocus: false,
      validate,
      onLetter,
      onCommit: value => {
        committed.push(value)
        return true
      }
    })
    return { boxes, field: parent.querySelector('input') as HTMLInputElement }
  }

  function typeValue(boxes: AcEdFloatingInputBoxes<Pointish>, text: string) {
    boxes.xInput.value = text
    boxes.xInput.userTyped = true
  }

  beforeEach(() => {
    onLetter = jest.fn(() => true)
    committed = []
    document.body.replaceChildren()
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('hands a typed letter to the command line instead of the number field', () => {
    const { boxes, field } = createBoxes()

    const event = press(field, 'L')

    expect(onLetter).toHaveBeenCalledWith('L')
    expect(event.defaultPrevented).toBe(true)
    expect(committed).toHaveLength(0)
    boxes.dispose()
  })

  it('leaves the letter alone when no command line takes it over', () => {
    onLetter = jest.fn(() => false)
    const { boxes, field } = createBoxes()

    const event = press(field, 'L')

    expect(onLetter).toHaveBeenCalledWith('L')
    expect(event.defaultPrevented).toBe(false)
    boxes.dispose()
  })

  it('does not route digits away from the field', () => {
    const { boxes, field } = createBoxes()

    const event = press(field, '5')

    expect(onLetter).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    boxes.dispose()
  })

  it('commits the typed value when Space confirms', () => {
    const { boxes, field } = createBoxes()
    typeValue(boxes, '50')

    const event = press(field, ' ')

    expect(event.defaultPrevented).toBe(true)
    expect(committed).toEqual([{ x: 50 }])
    boxes.dispose()
  })

  it('still commits on Enter', () => {
    const { boxes, field } = createBoxes()
    typeValue(boxes, '50')

    press(field, 'Enter')

    expect(committed).toEqual([{ x: 50 }])
    boxes.dispose()
  })
})
