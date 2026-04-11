import { AcEdPromptKeywordOptions } from '../src/editor/input/prompt/AcEdPromptKeywordOptions'
import { AcEdKeywordSession } from '../src/editor/input/session/AcEdKeywordSession'

describe('KeywordSession Enter behavior', () => {
  const createCliStub = () =>
    ({
      clearInput: jest.fn(),
      setInputReadOnly: jest.fn(),
      renderKeywordPrompt: jest.fn(),
      focusInput: jest.fn(),
      clear: jest.fn()
    }) as any

  const createSession = (options: AcEdPromptKeywordOptions) => {
    const session = new AcEdKeywordSession(createCliStub(), options, true)
    const resolved: string[] = []
    ;(session as any).resolve = (value: string) => resolved.push(value)
    return { session, resolved }
  }

  test('Enter with default keyword returns default keyword', () => {
    const options = new AcEdPromptKeywordOptions('pick')
    const kw = options.keywords.add('First', 'First', 'First')
    options.keywords.default = kw
    options.allowNone = false

    const { session, resolved } = createSession(options)
    const handled = session.handleEnter('')

    expect(handled).toBe(true)
    expect(resolved).toEqual(['First'])
  })

  test('Enter with no default and allowNone=true returns none token', () => {
    const options = new AcEdPromptKeywordOptions('pick')
    options.keywords.add('First', 'First', 'First')
    options.allowNone = true

    const { session, resolved } = createSession(options)
    const handled = session.handleEnter('')

    expect(handled).toBe(true)
    expect(resolved).toEqual([''])
  })

  test('Enter with no default and allowNone=false is invalid', () => {
    const options = new AcEdPromptKeywordOptions('pick')
    options.keywords.add('First', 'First', 'First')
    options.allowNone = false

    const { session, resolved } = createSession(options)
    const handled = session.handleEnter('')

    expect(handled).toBe(false)
    expect(resolved).toEqual([])
  })
})
