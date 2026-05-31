import {
  AcExHtmlI18n,
  ACEX_HTML_LOCALE_STORAGE_KEY,
  detectAcExHtmlLocale,
  detectBrowserAcExHtmlLocale,
  formatAcExHtmlMessage,
  resolveAcExHtmlLocale
} from '../src/AcExHtmlI18n'

describe('AcExHtmlI18n', () => {
  const originalNavigator = globalThis.navigator
  const originalLocalStorage = globalThis.localStorage
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value
        },
        removeItem: (key: string) => {
          delete storage[key]
        }
      }
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator
    })
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage
    })
  })

  function mockNavigator(languages: string[], language?: string): void {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        languages,
        language: language ?? languages[0] ?? 'en-US'
      }
    })
  }

  it('resolves locale codes', () => {
    expect(resolveAcExHtmlLocale('zh-CN')).toBe('zh')
    expect(resolveAcExHtmlLocale('en-US')).toBe('en')
    expect(resolveAcExHtmlLocale('fr')).toBeNull()
  })

  it('detects browser locale from language preferences', () => {
    mockNavigator(['zh-CN', 'en-US'])
    expect(detectBrowserAcExHtmlLocale()).toBe('zh')

    mockNavigator(['en-US', 'zh-CN'])
    expect(detectBrowserAcExHtmlLocale()).toBe('en')

    mockNavigator(['fr-FR'])
    expect(detectBrowserAcExHtmlLocale()).toBe('en')
  })

  it('prefers stored locale over browser language', () => {
    mockNavigator(['zh-CN'])
    localStorage.setItem(ACEX_HTML_LOCALE_STORAGE_KEY, 'en')
    expect(detectAcExHtmlLocale()).toBe('en')
  })

  it('falls back to browser locale when storage is empty', () => {
    mockNavigator(['zh-CN'])
    expect(detectAcExHtmlLocale()).toBe('zh')
  })

  it('translates messages with parameters', () => {
    const i18n = new AcExHtmlI18n('zh')
    expect(i18n.t('status.distance', { value: '12.5' })).toBe('距离：12.5')
    expect(formatAcExHtmlMessage('Zoom: {name}', { name: '0' })).toBe('Zoom: 0')
  })

  it('toggles between en and zh', () => {
    const i18n = new AcExHtmlI18n('en')
    expect(i18n.t('layers.title')).toBe('Layers')
    i18n.toggleLocale()
    expect(i18n.locale).toBe('zh')
    expect(i18n.t('layers.title')).toBe('图层')
  })
})
