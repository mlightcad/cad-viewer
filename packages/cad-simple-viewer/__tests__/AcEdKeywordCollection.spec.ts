import { AcEdKeywordCollection } from '../src/editor/input/prompt/AcEdKeywordCollection'
import { AcEdPromptKeywordOptions } from '../src/editor/input/prompt/AcEdPromptKeywordOptions'

describe('AcEdKeywordCollection prompt format', () => {
  test('formats as [Keywords] <Default>:', () => {
    const keywords = new AcEdKeywordCollection()
    const yes = keywords.add('Yes', 'Yes', 'Yes')
    keywords.add('No', 'No', 'No')
    keywords.default = yes

    const format = keywords.getPromptFormat()
    expect(format.visibleKeywords).toEqual(['Yes', 'No'])
    expect(format.defaultKeyword).toBe('Yes')
    expect(format.formattedTail).toBe('[Yes/No] <Yes>:')
  })

  test('omits default segment when no default is set', () => {
    const keywords = new AcEdKeywordCollection()
    keywords.add('Yes', 'Yes', 'Yes')
    keywords.add('No', 'No', 'No')

    const format = keywords.getPromptFormat()
    expect(format.defaultKeyword).toBeUndefined()
    expect(format.formattedTail).toBe('[Yes/No]:')
  })

  test('PromptOptions delegates format through getKeywordPromptFormat()', () => {
    const options = new AcEdPromptKeywordOptions('Specify option')
    const yes = options.keywords.add('Yes', 'Yes', 'Yes')
    options.keywords.add('No', 'No', 'No')
    options.keywords.default = yes

    const format = options.getKeywordPromptFormat()
    expect(format.formattedTail).toBe('[Yes/No] <Yes>:')
  })
})
