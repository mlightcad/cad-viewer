jest.mock('../src/i18n/AcApI18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import {
  acapResolveOpenFileErrorMessage,
  acapResolveOpenFileErrorTitle
} from '../src/util/AcApOpenFileErrorMessage'

describe('AcApOpenFileErrorMessage', () => {
  const t = (key: string, params?: Record<string, string>) => {
    let text = key
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(value)
      }
    }
    return text
  }

  it('maps license_expired to the license-expired message key', () => {
    expect(
      acapResolveOpenFileErrorMessage(t, {
        fileName: 'demo.dwg',
        errorCode: 'license_expired'
      })
    ).toBe('main.message.failedToOpenFileLicenseExpired')
  })

  it('maps license_invalid to the license-invalid message key', () => {
    expect(
      acapResolveOpenFileErrorMessage(t, {
        fileName: 'demo.dwg',
        errorCode: 'license_invalid'
      })
    ).toBe('main.message.failedToOpenFileLicenseInvalid')
  })

  it('maps license titles', () => {
    expect(acapResolveOpenFileErrorTitle(t, 'license_expired')).toBe(
      'main.notification.title.failedToOpenFileLicenseExpired'
    )
    expect(acapResolveOpenFileErrorTitle(t, 'license_invalid')).toBe(
      'main.notification.title.failedToOpenFileLicenseInvalid'
    )
  })

  it('falls back to the generic open-file message for unknown codes', () => {
    expect(
      acapResolveOpenFileErrorMessage(t, {
        fileName: 'demo.dwg',
        errorCode: 'parse_failed'
      })
    ).toBe('main.message.failedToOpenFile')
  })
})
