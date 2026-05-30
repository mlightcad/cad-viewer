import {
  AcExHtmlI18n,
  formatAcExHtmlMessage,
  resolveAcExHtmlLocale
} from '../src/AcExHtmlI18n'

describe('AcExHtmlI18n', () => {
  it('resolves locale codes', () => {
    expect(resolveAcExHtmlLocale('zh-CN')).toBe('zh')
    expect(resolveAcExHtmlLocale('en-US')).toBe('en')
    expect(resolveAcExHtmlLocale('fr')).toBeNull()
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
