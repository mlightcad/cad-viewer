import ar from '../../src/i18n/ar/simpleUi'
import cs from '../../src/i18n/cs/simpleUi'
import en from '../../src/i18n/en/simpleUi'
import tr from '../../src/i18n/tr/simpleUi'
import zh from '../../src/i18n/zh/simpleUi'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

const locales: Record<string, Record<string, string>> = {
  ar: flatten(ar as Tree),
  cs: flatten(cs as Tree),
  en: flatten(en as Tree),
  tr: flatten(tr as Tree),
  zh: flatten(zh as Tree)
}
const enFlat = locales.en
const findKeys = Object.keys(enFlat).filter(key =>
  key.startsWith('findPalette.')
)

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
        [...text.matchAll(/\{[a-zA-Z]+\}/g)].map(m => m[0]).sort()
      for (const key of findKeys) {
        expect(placeholders(locales[code][key])).toEqual(
          placeholders(enFlat[key])
        )
      }
    }
  )

  it('documents Enter-to-search in the English hint', () => {
    for (const name of ['hint', 'hintLayout'] as const) {
      expect(enFlat[`findPalette.${name}`]).toMatch(/Enter/i)
    }
  })
})
