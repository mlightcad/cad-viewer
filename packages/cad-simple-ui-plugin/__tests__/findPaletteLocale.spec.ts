import { ar } from '../src/i18n/ar'
import { cs } from '../src/i18n/cs'
import { en } from '../src/i18n/en'
import { tr } from '../src/i18n/tr'
import { zh } from '../src/i18n/zh'

const locales: Record<string, Record<string, string>> = { ar, cs, en, tr, zh }
const findKeys = Object.keys(en).filter(key => key.startsWith('findPalette.'))

describe('Find palette locale messages', () => {
  it('defines every hit type, including block, dimension, leader and table', () => {
    for (const kind of [
      'text',
      'mtext',
      'attribute',
      'block',
      'dimension',
      'leader',
      'table'
    ]) {
      expect(findKeys).toContain(`findPalette.kind.${kind}`)
    }
    expect(findKeys).toContain('findPalette.unnamedLayout')
  })

  it.each(Object.keys(locales))(
    '%s has a non-empty message for every Find key',
    code => {
      const messages = locales[code]
      for (const key of findKeys) {
        expect(typeof messages[key]).toBe('string')
        expect(messages[key].trim()).not.toBe('')
      }
    }
  )

  it.each(Object.keys(locales))(
    '%s keeps the {count} / {layouts} / {layout} placeholders of the English messages',
    code => {
      const placeholders = (text: string) =>
        (text.match(/\{\w+\}/g) ?? []).sort().join(',')
      for (const key of findKeys) {
        expect(placeholders(locales[code][key])).toBe(placeholders(en[key]))
      }
    }
  )

  it.each(['hint', 'hintLayout'])(
    'the %s message names the text found in blocks, dimensions, leaders and tables',
    name => {
      expect(en[`findPalette.${name}`]).toMatch(
        /blocks, dimensions, leaders and tables/
      )
    }
  )

  it('Arabic wording does not depend on a plural form (the plugin has no plural rules)', () => {
    for (const key of ['count', 'countLayouts', 'countTruncated']) {
      expect(ar[`findPalette.${key}`]).not.toContain('|')
    }
  })
})
