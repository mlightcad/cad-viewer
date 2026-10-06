/**
 * @jest-environment jsdom
 */
import {
  ACAP_DEFAULT_DOCS_BASE_URL,
  ACAP_DOCS_PATH_MAGNIFIER,
  acapDocsUrl,
  acapGetDocsBaseUrl,
  acapSetDocsBaseUrl,
  normalizeDocsBaseUrl
} from '../src/app/AcApDocsUrl'

describe('acapDocsUrl', () => {
  afterEach(() => {
    acapSetDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)
  })

  it('builds English URLs without a locale segment', () => {
    expect(acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER, 'en')).toBe(
      `${normalizeDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)}/guide/magnifier.html`
    )
  })

  it('inserts a locale segment for non-English locales', () => {
    expect(acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER, 'zh')).toBe(
      `${normalizeDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)}/zh/guide/magnifier.html`
    )
    expect(acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER, 'ja-JP')).toBe(
      `${normalizeDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)}/ja/guide/magnifier.html`
    )
  })

  it('defaults to English when locale is omitted', () => {
    expect(acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER)).toBe(
      `${normalizeDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)}/guide/magnifier.html`
    )
  })

  it('respects a configured docs base URL', () => {
    acapSetDocsBaseUrl('https://example.com/help/')
    expect(acapGetDocsBaseUrl()).toBe('https://example.com/help')
    expect(acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER, 'zh')).toBe(
      'https://example.com/help/zh/guide/magnifier.html'
    )
  })
})
