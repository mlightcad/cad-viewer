import { validateCadScript } from '../../cad-agent-core/src/script/validateCadScript'

import {
  filterScriptExamples,
  SCRIPT_EXAMPLE_IDS,
  SCRIPT_EXAMPLES
} from '../src/examples/scriptExamples'
import { scriptExampleCopyByLocale } from '../src/i18n/exampleCopy'

describe('script examples', () => {
  it('gives every locale a title and description for each example', () => {
    for (const copy of Object.values(scriptExampleCopyByLocale)) {
      expect(Object.keys(copy).sort()).toEqual([...SCRIPT_EXAMPLE_IDS].sort())
      for (const id of SCRIPT_EXAMPLE_IDS) {
        expect(copy[id].title.trim().length).toBeGreaterThan(0)
        expect(copy[id].description.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('matches a localized description and the script source', () => {
    const copy = scriptExampleCopyByLocale.zh
    expect(
      filterScriptExamples(SCRIPT_EXAMPLES, copy, '圆最多').map(item => item.id)
    ).toEqual(['circlesByLayer'])
    expect(
      filterScriptExamples(SCRIPT_EXAMPLES, copy, 'drawCircle').map(
        item => item.id
      )
    ).toEqual(['circleGrid'])
  })

  it('accepts every example as a cad script', () => {
    for (const example of SCRIPT_EXAMPLES) {
      expect(validateCadScript(example.code)).toEqual(
        expect.objectContaining({ ok: true })
      )
    }
  })

  it('returns the full catalog for a blank query', () => {
    expect(
      filterScriptExamples(SCRIPT_EXAMPLES, scriptExampleCopyByLocale.en, '  ')
    ).toEqual([...SCRIPT_EXAMPLES])
  })
})
