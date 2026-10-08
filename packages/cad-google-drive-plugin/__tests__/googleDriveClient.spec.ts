import {
  isGoogleDriveConfigured,
  isGoogleDrivePickerConfigured
} from '../src/googleDriveClient'

describe('isGoogleDriveConfigured', () => {
  it('rejects empty or placeholder credentials', () => {
    expect(
      isGoogleDriveConfigured({
        clientId: '',
        apiKey: 'real-key'
      })
    ).toBe(false)
    expect(
      isGoogleDriveConfigured({
        clientId: 'your_google_client_id_here',
        apiKey: 'real-key'
      })
    ).toBe(false)
    expect(
      isGoogleDriveConfigured({
        clientId: '123.apps.googleusercontent.com',
        apiKey: 'your_google_api_key_here'
      })
    ).toBe(false)
  })

  it('accepts non-placeholder client id and api key', () => {
    expect(
      isGoogleDriveConfigured({
        clientId: '123.apps.googleusercontent.com',
        apiKey: 'AIzaSyRealKey'
      })
    ).toBe(true)
  })
})

describe('isGoogleDrivePickerConfigured', () => {
  it('requires a numeric app id as well', () => {
    expect(
      isGoogleDrivePickerConfigured({
        clientId: '123.apps.googleusercontent.com',
        apiKey: 'AIzaSyRealKey',
        appId: 'your_google_app_id_here'
      })
    ).toBe(false)
    expect(
      isGoogleDrivePickerConfigured({
        clientId: '123.apps.googleusercontent.com',
        apiKey: 'AIzaSyRealKey',
        appId: '123456789012'
      })
    ).toBe(true)
  })
})
