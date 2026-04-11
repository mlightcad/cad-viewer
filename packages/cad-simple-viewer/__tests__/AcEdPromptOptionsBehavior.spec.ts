import { AcEdPromptNumericalOptions } from '../src/editor/input/prompt/AcEdPromptNumericalOptions'
import { AcEdPromptStringOptions } from '../src/editor/input/prompt/AcEdPromptStringOptions'
import { AcEdPromptDoubleOptions } from '../src/editor/input/prompt/AcEdPromptDoubleOptions'
import { AcEdPromptIntegerOptions } from '../src/editor/input/prompt/AcEdPromptIntegerOptions'
import { AcEdPromptDistanceOptions } from '../src/editor/input/prompt/AcEdPromptDistanceOptions'
import { AcEdFloatingInputBoxes } from '../src/editor/input/ui/AcEdFloatingInputBoxes'

describe('FloatingInputBoxes Enter priority', () => {
  type InputStub = {
    userTyped: boolean
    value: string
    focused: boolean
    markValid: jest.Mock
    markInvalid: jest.Mock
    focus: jest.Mock
    select: jest.Mock
    isEventTarget: (e: KeyboardEvent) => boolean
  }

  const createInputStub = (userTyped: boolean): InputStub => ({
    userTyped,
    value: '',
    focused: true,
    markValid: jest.fn(),
    markInvalid: jest.fn(),
    focus: jest.fn(),
    select: jest.fn(),
    isEventTarget: () => false
  })

  const createBoxes = (opts: {
    userTyped: boolean
    useDefaultValue?: boolean
    defaultValue?: unknown
    allowNone?: boolean
  }) => {
    const boxes = Object.create(AcEdFloatingInputBoxes.prototype) as any
    boxes.twoInputs = false
    boxes.xInput = createInputStub(opts.userTyped)
    boxes.yInput = undefined
    boxes.useDefaultValue = !!opts.useDefaultValue
    boxes.defaultValue = opts.defaultValue
    boxes.allowNone = !!opts.allowNone
    boxes.onCommit = jest.fn(() => true)
    boxes.onNone = jest.fn()
    boxes.onCancel = jest.fn()
    boxes.validateFn = jest.fn(() => ({ isValid: false }))
    return boxes
  }

  const createEnterEvent = () =>
    ({
      key: 'Enter',
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    }) as any as KeyboardEvent

  test('defaultValue takes precedence over allowNone', () => {
    const boxes = createBoxes({
      userTyped: false,
      useDefaultValue: true,
      defaultValue: 42,
      allowNone: true
    })
    const e = createEnterEvent()

    ;(boxes as any).handleKeyDown(e)

    expect(boxes.onCommit).toHaveBeenCalledWith(42)
    expect(boxes.onNone).not.toHaveBeenCalled()
  })

  test('no default and allowNone=true returns None', () => {
    const boxes = createBoxes({
      userTyped: false,
      useDefaultValue: false,
      allowNone: true
    })
    const e = createEnterEvent()

    ;(boxes as any).handleKeyDown(e)

    expect(boxes.onNone).toHaveBeenCalledTimes(1)
    expect(boxes.onCommit).not.toHaveBeenCalled()
  })

  test('no default and allowNone=false keeps prompting (invalid)', () => {
    const boxes = createBoxes({
      userTyped: false,
      useDefaultValue: false,
      allowNone: false
    })
    const e = createEnterEvent()

    ;(boxes as any).handleKeyDown(e)

    expect(boxes.onCommit).not.toHaveBeenCalled()
    expect(boxes.onNone).not.toHaveBeenCalled()
    expect(boxes.xInput.markInvalid).toHaveBeenCalledTimes(1)
  })
})

describe('Prompt option classes behavior matrix', () => {
  type Outcome = 'default' | 'none' | 'invalid'

  const simulateEnterByPromptOptions = (promptOptions: {
    useDefaultValue?: boolean
    defaultValue?: unknown
    allowNone?: boolean
  }): Outcome => {
    const boxes = Object.create(AcEdFloatingInputBoxes.prototype) as any
    boxes.twoInputs = false
    boxes.xInput = {
      userTyped: false,
      value: '',
      focused: true,
      markValid: jest.fn(),
      markInvalid: jest.fn(),
      focus: jest.fn(),
      select: jest.fn(),
      isEventTarget: () => false
    }
    boxes.yInput = undefined
    boxes.useDefaultValue = !!promptOptions.useDefaultValue
    boxes.defaultValue = promptOptions.defaultValue
    boxes.allowNone = !!promptOptions.allowNone
    boxes.onCommit = jest.fn(() => true)
    boxes.onNone = jest.fn()
    boxes.onCancel = jest.fn()
    boxes.validateFn = jest.fn(() => ({ isValid: false }))

    const e = {
      key: 'Enter',
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    } as any as KeyboardEvent

    ;(boxes as any).handleKeyDown(e)

    if (boxes.onCommit.mock.calls.length > 0) return 'default'
    if (boxes.onNone.mock.calls.length > 0) return 'none'
    return 'invalid'
  }

  test('AcEdPromptNumericalOptions: default > none > invalid', () => {
    const opt = new AcEdPromptNumericalOptions('num')
    opt.useDefaultValue = true
    opt.defaultValue = 7
    opt.allowNone = true
    expect(simulateEnterByPromptOptions(opt as any)).toBe('default')

    opt.useDefaultValue = false
    opt.allowNone = true
    expect(simulateEnterByPromptOptions(opt as any)).toBe('none')

    opt.allowNone = false
    expect(simulateEnterByPromptOptions(opt as any)).toBe('invalid')
  })

  test('AcEdPromptStringOptions: supports default on Enter', () => {
    const opt = new AcEdPromptStringOptions('str')
    opt.useDefaultValue = true
    opt.defaultValue = 'abc'
    expect(simulateEnterByPromptOptions(opt as any)).toBe('default')

    opt.useDefaultValue = false
    expect(simulateEnterByPromptOptions(opt as any)).toBe('invalid')
  })

  test('AcEdPromptNumericalOptions subclasses share same Enter priority', () => {
    const subclasses = [
      new AcEdPromptDoubleOptions('dbl'),
      new AcEdPromptIntegerOptions('int'),
      new AcEdPromptDistanceOptions('dist')
    ]

    subclasses.forEach(opt => {
      opt.useDefaultValue = true
      opt.defaultValue = 9
      opt.allowNone = true
      expect(simulateEnterByPromptOptions(opt as any)).toBe('default')

      opt.useDefaultValue = false
      opt.allowNone = true
      expect(simulateEnterByPromptOptions(opt as any)).toBe('none')

      opt.allowNone = false
      expect(simulateEnterByPromptOptions(opt as any)).toBe('invalid')
    })
  })
})
