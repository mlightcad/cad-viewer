import { AcEdPointHandler } from '../src/editor/input/handler/AcEdPointHandler'
import { AcEdPromptKeywordOptions } from '../src/editor/input/prompt/AcEdPromptKeywordOptions'
import { AcEdPromptPointOptions } from '../src/editor/input/prompt/AcEdPromptPointOptions'
import { AcEdPromptInputSession } from '../src/editor/input/session/AcEdPromptInputSession'

describe('AcEdPromptInputSession precedence', () => {
  const createCliStub = () =>
    ({
      clearInput: jest.fn(),
      setInputReadOnly: jest.fn(),
      renderKeywordPrompt: jest.fn(),
      focusInput: jest.fn(),
      clear: jest.fn(),
      hasCommand: jest.fn(
        (text: string) => text.trim().toUpperCase() === 'LINE'
      )
    }) as any

  const createSession = (
    options: AcEdPromptKeywordOptions,
    mode: 'geometric' | 'string' | 'keyword'
  ) => {
    const handler = new AcEdPointHandler(new AcEdPromptPointOptions('point'))
    const session = new AcEdPromptInputSession(
      createCliStub(),
      options,
      text => {
        if (text === '50,30') return { x: 50, y: 30, z: 0 }
        return null
      },
      mode,
      false,
      true
    )
    const resolved: Array<{
      kind: string
      value?: unknown
      keyword?: string
      command?: string
    }> = []
    ;(session as any).resolve = (value: unknown) => resolved.push(value as any)
    return { session, resolved }
  }

  test('geometric mode prefers coordinates over keywords', () => {
    const options = new AcEdPromptKeywordOptions('pick')
    options.keywords.add('Close', 'Close', 'C')

    const { session, resolved } = createSession(options, 'geometric')
    const handled = session.handleEnter('50,30')

    expect(handled).toBe(true)
    expect(resolved[0]).toEqual({
      kind: 'value',
      value: { x: 50, y: 30, z: 0 }
    })
  })

  test('geometric mode resolves keyword when coordinate parse fails', () => {
    const options = new AcEdPromptKeywordOptions('pick')
    options.keywords.add('Close', 'Close', 'C')

    const { session, resolved } = createSession(options, 'geometric')
    const handled = session.handleEnter('C')

    expect(handled).toBe(true)
    expect(resolved[0]).toEqual({ kind: 'keyword', keyword: 'Close' })
  })

  test('geometric mode hands a registered command name back to the caller', () => {
    const options = new AcEdPromptKeywordOptions('pick')

    const { session, resolved } = createSession(options, 'geometric')
    const handled = session.handleEnter('line')

    expect(handled).toBe(true)
    expect(resolved[0]).toEqual({ kind: 'command', command: 'line' })
  })

  test('geometric mode keeps prompt keywords ahead of command names', () => {
    const options = new AcEdPromptKeywordOptions('pick')
    options.keywords.add('Line', 'Line', 'LINE')

    const { session, resolved } = createSession(options, 'geometric')
    session.handleEnter('LINE')

    expect(resolved[0]).toEqual({ kind: 'keyword', keyword: 'Line' })
  })

  test('geometric mode still rejects text that is neither value nor command', () => {
    const options = new AcEdPromptKeywordOptions('pick')

    const { session, resolved } = createSession(options, 'geometric')
    const handled = session.handleEnter('zzz')

    expect(handled).toBe(false)
    expect(resolved).toHaveLength(0)
  })

  test('string mode keeps arbitrary text as the value instead of a command', () => {
    const options = new AcEdPromptKeywordOptions('name')

    const { session, resolved } = createSession(options, 'string')
    const handled = session.handleEnter('LINE')

    expect(handled).toBe(false)
    expect(resolved).toHaveLength(0)
  })
})
