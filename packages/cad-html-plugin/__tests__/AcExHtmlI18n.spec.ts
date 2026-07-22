import {
  ACEX_HTML_LOCALE_STORAGE_KEY,
  AcExHtmlI18n,
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
    expect(resolveAcExHtmlLocale('cs-CZ')).toBe('cs')
    expect(resolveAcExHtmlLocale('tr-TR')).toBe('tr')
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

  it('cycles the locale through en -> zh -> cs -> tr -> en', () => {
    const i18n = new AcExHtmlI18n('en')
    expect(i18n.t('layers.title')).toBe('Layers')
    expect(i18n.localeBadge).toBe('EN')

    expect(i18n.toggleLocale()).toBe('zh')
    expect(i18n.t('layers.title')).toBe('图层')
    expect(i18n.localeBadge).toBe('中')

    expect(i18n.toggleLocale()).toBe('cs')
    expect(i18n.t('layers.title')).toBe('Hladiny')
    expect(i18n.localeBadge).toBe('CS')

    expect(i18n.toggleLocale()).toBe('tr')
    expect(i18n.t('layers.title')).toBe('Katmanlar')
    expect(i18n.localeBadge).toBe('TR')

    expect(i18n.toggleLocale()).toBe('en')
    expect(i18n.locale).toBe('en')
  })

  it('translates Turkish messages with parameters', () => {
    const i18n = new AcExHtmlI18n('tr')
    expect(i18n.t('status.distance', { value: '12.5' })).toBe('Mesafe: 12.5')
    expect(i18n.t('layers.zoomTo', { name: 'Duvarlar' })).toBe(
      'Duvarlar katmanına yakınlaştır'
    )
  })
})
