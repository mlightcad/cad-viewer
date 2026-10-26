import { createI18n } from 'vue-i18n'

import arMain from '../src/locale/ar/main'
import csMain from '../src/locale/cs/main'
import enCommand from '../src/locale/en/command'
import enMain from '../src/locale/en/main'
import { arPluralRule, pluralRules } from '../src/locale/pluralRules'
import trMain from '../src/locale/tr/main'
import zhMain from '../src/locale/zh/main'

const mains = { ar: arMain, cs: csMain, en: enMain, tr: trMain, zh: zhMain }
type Find = typeof enMain.toolPalette.find
const findOf = (code: keyof typeof mains) =>
  mains[code].toolPalette.find as unknown as Record<string, unknown>

const KINDS = [
  'text',
  'mtext',
  'attribute',
  'block',
  'dimension',
  'leader',
  'table'
]

const create = (locale: keyof typeof mains) =>
  createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    pluralRules,
    missingWarn: false,
    fallbackWarn: false,
    messages: Object.fromEntries(
      Object.entries(mains).map(([code, main]) => [code, { main }])
    )
  }).global

describe('Find palette locale messages (cad-viewer)', () => {
  it.each(Object.keys(mains) as Array<keyof typeof mains>)(
    '%s translates every hit type, so no raw key is shown',
    code => {
      const { t } = create(code)
      for (const kind of KINDS) {
        const key = `main.toolPalette.find.kind.${kind}`
        const value = t(key)
        expect(value).not.toBe(key)
        expect(value.trim()).not.toBe('')
      }
      expect(t('main.toolPalette.find.unnamedLayout')).not.toBe(
        'main.toolPalette.find.unnamedLayout'
      )
    }
  )

  it('falls back to English when a locale lacks a hit type', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'xx',
      fallbackLocale: 'en',
      missingWarn: false,
      fallbackWarn: false,
      messages: { en: { main: enMain }, xx: { main: { toolPalette: {} } } }
    }).global
    expect(i18n.t('main.toolPalette.find.kind.table')).toBe('Table')
    expect(i18n.t('main.toolPalette.find.kind.block')).toBe('Block text')
  })

  it.each(Object.keys(mains) as Array<keyof typeof mains>)(
    '%s keeps the Find keys and placeholders of the English messages',
    code => {
      const en = findOf('en')
      const loc = findOf(code)
      for (const key of Object.keys(en)) {
        if (key === 'kind') continue
        expect(typeof loc[key]).toBe('string')
        // Plural forms repeat a placeholder; compare the set of names.
        const placeholders = (s: unknown) =>
          [...new Set(String(s).match(/\{\w+\}/g) ?? [])].sort().join(',')
        expect(placeholders(loc[key])).toBe(placeholders(en[key]))
      }
    }
  )

  it.each(['hint', 'hintLayout'] as Array<keyof Find>)(
    'the %s message names blocks, dimensions, leaders and tables',
    key => {
      expect(enMain.toolPalette.find[key]).toMatch(
        /blocks, dimensions, leaders and tables/
      )
    }
  )

  it('the FIND command description is no longer attribute-only', () => {
    expect(enCommand.ACAD.find.description).toMatch(
      /blocks, dimensions, leaders and tables/
    )
  })
})

describe('Arabic Find pluralization', () => {
  const ar = () => create('ar')
  const count = (n: number) =>
    ar().t('main.toolPalette.find.count', { count: n }, n)
  const truncated = (n: number) =>
    ar().t('main.toolPalette.find.countTruncated', { count: n }, n)
  const layouts = (n: number) =>
    ar().t('main.toolPalette.find.countLayouts', { count: n, layouts: 3 }, n)

  it('maps counts to the six CLDR plural categories', () => {
    const category = (n: number) => arPluralRule(n, 6)
    expect([0, 1, 2, 3, 10, 11, 99, 100, 102, 103, 111].map(category)).toEqual([
      0, 1, 2, 3, 3, 4, 4, 5, 5, 3, 4
    ])
  })

  it('uses the singular, dual, few and many wording', () => {
    expect(count(1)).toBe('تم العثور على نتيجة واحدة')
    expect(count(2)).toBe('تم العثور على نتيجتين')
    expect(count(3)).toBe('تم العثور على 3 نتائج')
    expect(count(10)).toBe('تم العثور على 10 نتائج')
    expect(count(11)).toBe('تم العثور على 11 نتيجة')
    expect(count(100)).toBe('تم العثور على 100 نتيجة')
    expect(count(103)).toBe('تم العثور على 103 نتائج')
    expect(truncated(1)).toBe('تم عرض أول نتيجة — قم بتضييق البحث')
    expect(truncated(500)).toBe('تم عرض أول 500 نتيجة — قم بتضييق البحث')
    expect(layouts(2)).toBe('تم العثور على نتيجتين (عدد التخطيطات: 3)')
    expect(layouts(7)).toBe('تم العثور على 7 نتائج (عدد التخطيطات: 3)')
  })

  it('does not change single-form messages of other locales', () => {
    for (const code of ['en', 'zh', 'cs', 'tr'] as const) {
      const { t } = create(code)
      const plain = t('main.toolPalette.find.count', { count: 5 })
      expect(t('main.toolPalette.find.count', { count: 5 }, 5)).toBe(plain)
      expect(t('main.toolPalette.find.count', { count: 1 }, 1)).toContain('1')
    }
    expect(create('en').t('main.toolPalette.find.count', { count: 5 }, 5)).toBe(
      '5 found'
    )
  })

  it('keeps vue-i18n default behaviour for non-Arabic message shapes', () => {
    expect(arPluralRule(0, 2)).toBe(1)
    expect(arPluralRule(1, 2)).toBe(0)
    expect(arPluralRule(5, 2)).toBe(1)
    expect(arPluralRule(0, 3)).toBe(0)
    expect(arPluralRule(1, 3)).toBe(1)
    expect(arPluralRule(7, 3)).toBe(2)
  })
})
