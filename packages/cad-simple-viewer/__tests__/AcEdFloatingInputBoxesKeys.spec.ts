/** @jest-environment jsdom */

import { AcEdFloatingInputBoxes } from '../src/editor/input/ui/AcEdFloatingInputBoxes'
import type { AcEdFloatingInputRawData } from '../src/editor/input/ui/AcEdFloatingInputTypes'

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
  return Number.isFinite(x) ? { isValid: true, value: x } : { isValid: false }
}

describe('AcEdFloatingInputBoxes key routing', () => {
  let parent: HTMLDivElement
  let committed: number[]

  function createBoxes(
    options: { spaceCommits?: boolean; onLetter?: jest.Mock } = {}
  ) {
    const boxes = new AcEdFloatingInputBoxes<number>({
      parent,
      twoInputs: false,
      autoFocus: false,
      validate,
      onCommit: value => {
        committed.push(value)
        return true
      },
      ...options
    })
    const field = parent.querySelector('input') as HTMLInputElement
    return { boxes, field }
  }

  beforeEach(() => {
    committed = []
    parent = document.createElement('div')
    document.body.appendChild(parent)
  })

  afterEach(() => {
    parent.remove()
  })

  it('commits a typed value with Space when enabled', () => {
    const { boxes, field } = createBoxes({ spaceCommits: true })
    boxes.xInput.value = '12'
    boxes.xInput.userTyped = true

    const event = press(field, ' ')

    expect(committed).toEqual([12])
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves Space alone by default', () => {
    const { boxes, field } = createBoxes()
    boxes.xInput.value = '12'
    boxes.xInput.userTyped = true

    const event = press(field, ' ')

    expect(committed).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })

  it('hands letters to onLetter and consumes them', () => {
    const onLetter = jest.fn(() => true)
    const { field } = createBoxes({ onLetter })

    const event = press(field, 'U')

    expect(onLetter).toHaveBeenCalledWith('U')
    expect(event.defaultPrevented).toBe(true)
  })

  it('keeps the letter when onLetter declines it', () => {
    const onLetter = jest.fn(() => false)
    const { field } = createBoxes({ onLetter })

    const event = press(field, 'u')

    expect(onLetter).toHaveBeenCalledWith('u')
    expect(event.defaultPrevented).toBe(false)
  })

  it('does not route digits or shortcut chords to onLetter', () => {
    const onLetter = jest.fn(() => true)
    const { field } = createBoxes({ onLetter })

    press(field, '5')
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })
    )

    expect(onLetter).not.toHaveBeenCalled()
  })

  it('hands coordinate prefix keys to onLetter', () => {
    const onLetter = jest.fn(() => true)
    const { field } = createBoxes({ onLetter })

    for (const key of ['@', '#', '*', '<']) {
      const event = press(field, key)
      expect(onLetter).toHaveBeenCalledWith(key)
      expect(event.defaultPrevented).toBe(true)
    }
  })
})
