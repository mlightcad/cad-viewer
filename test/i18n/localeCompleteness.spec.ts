/**
 * Every user-facing catalog must be fully translated into every supported
 * locale. A key missing from a locale silently falls back to English at
 * runtime, and a value copied verbatim from English shows English in the UI,
 * so both are reported here.
 *
 * When adding a catalog, register it in `CATALOGS`. When a value is genuinely
 * the same as English in a language (brand names, loanwords such as Czech
 * "Text"), add it to `NEUTRAL_VALUES` (all languages) or `SAME_AS_ENGLISH`
 * (one language) — never to silence a missing translation.
 */
import { agentCommandDescriptions } from '../../packages/cad-agent-plugin/src/i18n/command'
import { ACEX_HTML_MESSAGES } from '../../packages/cad-html-core/src/AcExHtmlI18n'
import { llmCommandDescriptions } from '../../packages/cad-llm-plugin/src/i18n/command'
import { scriptCommandDescriptions } from '../../packages/cad-script-plugin/src/i18n/command'
import { scriptExampleCopyByLocale } from '../../packages/cad-script-plugin/src/i18n/exampleCopy'

const LOCALES = ['zh', 'ja', 'ko', 'tr', 'cs', 'ar'] as const
type Locale = 'en' | (typeof LOCALES)[number]

const PKG = '../../packages'

// Catalogs are resolved per locale from a path template, so they are loaded
// with require() rather than ~100 static imports.
/* eslint-disable @typescript-eslint/no-require-imports */
const loadDefault = (path: string) => () => require(path).default as unknown
const loadNamed = (path: string) => () =>
  Object.values(require(path) as Record<string, unknown>)[0]
/* eslint-enable @typescript-eslint/no-require-imports */
const fromRecord = (record: Record<string, unknown>, locale: Locale) =>
  record[locale]

/** Per-locale loaders for each catalog. */
const CATALOGS: Record<string, (locale: Locale) => unknown> = {
  'cad-editor/main': l =>
    loadDefault(`${PKG}/cad-editor/src/locale/${l}/main`)(),
  'cad-editor/command': l =>
    loadDefault(`${PKG}/cad-editor/src/locale/${l}/command`)(),
  'cad-editor/dialog': l =>
    loadDefault(`${PKG}/cad-editor/src/locale/${l}/dialog`)(),
  'cad-editor/entity': l =>
    loadDefault(`${PKG}/cad-editor/src/locale/${l}/entity`)(),
  'cad-simple-viewer/main': l =>
    loadDefault(`${PKG}/cad-simple-viewer/src/i18n/${l}/main`)(),
  'cad-simple-viewer/command': l =>
    loadDefault(`${PKG}/cad-simple-viewer/src/i18n/${l}/command`)(),
  'cad-simple-viewer/jig': l =>
    loadDefault(`${PKG}/cad-simple-viewer/src/i18n/${l}/jig`)(),
  'cad-editor-demo': l =>
    loadDefault(`${PKG}/cad-editor-demo/src/locale/${l}`)(),
  'cad-agent-plugin': l => loadNamed(`${PKG}/cad-agent-plugin/src/i18n/${l}`)(),
  'cad-agent-plugin/command': l => fromRecord(agentCommandDescriptions, l),
  'cad-llm-plugin': l => loadNamed(`${PKG}/cad-llm-plugin/src/i18n/${l}`)(),
  'cad-llm-plugin/command': l => fromRecord(llmCommandDescriptions, l),
  'cad-script-plugin': l =>
    loadNamed(`${PKG}/cad-script-plugin/src/i18n/${l}`)(),
  'cad-script-plugin/command': l => fromRecord(scriptCommandDescriptions, l),
  'cad-script-plugin/examples': l => fromRecord(scriptExampleCopyByLocale, l),
  'cad-simple-ui-plugin': l =>
    loadNamed(`${PKG}/cad-simple-ui-plugin/src/i18n/${l}`)(),
  'cad-simple-ui-plugin/command': l =>
    loadNamed(`${PKG}/cad-simple-ui-plugin/src/i18n/command-${l}`)(),
  'cad-html-core': l => ACEX_HTML_MESSAGES[l]
}

/** Values that are identical to English in every language. */
const NEUTRAL_VALUES = new Set<string>([
  'GitHub',
  'OneDrive',
  'Google Drive',
  'DeepSeek',
  'OpenAI',
  'Anthropic',
  'OpenAI Chat Completions',
  'OpenAI Responses',
  'Anthropic Messages',
  'English',
  'Čeština',
  'Türkçe',
  'RGB: ',
  'px',
  'URL…',
  'db.read',
  'https://example.com/drawing.dwg',
  'https://example.com/drawing.acex.json',
  '0-256, BYLAYER, BYBLOCK',
  // DXF entity type names with no localized AutoCAD name.
  'Ole2Frame',
  'OleFrame',
  // Font technology name (pdftext panel).
  'TrueType'
])

/** Values that are legitimately identical to English in one language. */
const SAME_AS_ENGLISH: Partial<Record<Locale, Set<string>>> = {
  // Command-line keyword the user types; zh keeps the English token.
  zh: new Set(['ZAxis']),
  // Turkish loanwords and CSS color proper names.
  tr: new Set([
    'Model',
    'Normal',
    'Normal(N)',
    'MText',
    'Spline',
    'Spline(S)',
    'Delta  \\U+0394',
    'Ohm  \\U+2126',
    'Omega  \\U+03A9',
    'Gainsboro',
    'Moccasin',
    'Peru',
    'Rebeccapurple',
    'Sienna'
  ]),
  // Czech words spelled the same as English.
  cs: new Set([
    'Agent',
    'CAD Agent',
    'Model',
    'Text',
    'MText',
    'Spline',
    'Polygon',
    'Tolerance',
    'Symbol',
    'Zoom',
    'Zoom: {name}',
    'Import',
    'Export',
    'Reference',
    'Reference(R)',
    'Symbol:',
    'Text(T)',
    'Instance {index}/{count} ({state})'
  ])
}

const flatten = (
  value: unknown,
  prefix = '',
  out = new Map<string, string>()
) => {
  if (typeof value === 'string') {
    out.set(prefix, value)
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
  }
  return out
}

/**
 * Strings with no words once placeholders are removed, short all-caps tokens
 * (`PDF`, `UCS`, `X`), and command-line `global` keywords (always English).
 */
const isLanguageNeutral = (key: string, value: string) => {
  if (key.endsWith('.global')) return true
  if (NEUTRAL_VALUES.has(value)) return true
  const stripped = value.replace(/\{[^}]*\}/g, '').trim()
  return (
    !/[A-Za-z]{2,}/.test(stripped) || /^[A-Z0-9\s./()+:-]{1,8}$/.test(stripped)
  )
}

describe('locale catalogs are fully translated', () => {
  for (const [name, load] of Object.entries(CATALOGS)) {
    describe(name, () => {
      const en = flatten(load('en'))

      it('has English messages', () => {
        expect(en.size).toBeGreaterThan(0)
      })

      for (const locale of LOCALES) {
        it(locale, () => {
          const target = flatten(load(locale))
          const allowed = SAME_AS_ENGLISH[locale]
          const missing = [...en.keys()].filter(key => !target.has(key))
          const untranslated = [...en]
            .filter(
              ([key, value]) =>
                target.get(key) === value &&
                !isLanguageNeutral(key, value) &&
                !allowed?.has(value)
            )
            .map(([key, value]) => `${key}: ${value}`)
          expect({ missing, untranslated }).toEqual({
            missing: [],
            untranslated: []
          })
        })
      }
    })
  }
})
