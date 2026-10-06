import {
  isAllowedMicrosoftResourceUrl,
  isAllowedPickerMessageOrigin,
  resolveOneDrivePickerScopes
} from '../src/oneDriveClient'

describe('resolveOneDrivePickerScopes', () => {
  it('uses Graph scopes for work-account Graph authenticate commands', () => {
    expect(
      resolveOneDrivePickerScopes('business', {
        type: 'Graph',
        resource: 'https://graph.microsoft.com'
      })
    ).toEqual(['User.Read', 'Files.Read.All'])
  })

  it('uses consumer OneDrive scopes for personal Graph authenticate commands', () => {
    expect(
      resolveOneDrivePickerScopes('personal', {
        type: 'Graph',
        resource: 'https://onedrive.live.com/picker'
      })
    ).toEqual(['OneDrive.ReadOnly'])
  })

  it('uses SharePoint /.default for business SharePoint commands', () => {
    expect(
      resolveOneDrivePickerScopes('business', {
        type: 'SharePoint',
        resource: 'https://contoso-my.sharepoint.com'
      })
    ).toEqual(['https://contoso-my.sharepoint.com/.default'])
  })
})

describe('isAllowedMicrosoftResourceUrl', () => {
  it('allows Graph, SharePoint, and OneDrive hosts over https', () => {
    expect(
      isAllowedMicrosoftResourceUrl(
        'https://graph.microsoft.com/v1.0/drives/x/items/y'
      )
    ).toBe(true)
    expect(
      isAllowedMicrosoftResourceUrl(
        'https://contoso-my.sharepoint.com/_api/v2.0/drives/x'
      )
    ).toBe(true)
    expect(
      isAllowedMicrosoftResourceUrl(
        'https://api.onedrive.com/v1.0/drives/x/items/y'
      )
    ).toBe(true)
  })

  it('rejects non-https and unknown hosts', () => {
    expect(
      isAllowedMicrosoftResourceUrl('http://graph.microsoft.com/v1.0/me')
    ).toBe(false)
    expect(
      isAllowedMicrosoftResourceUrl('https://evil.example/steal')
    ).toBe(false)
  })
})

describe('isAllowedPickerMessageOrigin', () => {
  it('requires a consumer picker origin for personal drives', () => {
    expect(
      isAllowedPickerMessageOrigin(
        'https://onedrive.live.com',
        'personal',
        ''
      )
    ).toBe(true)
    expect(
      isAllowedPickerMessageOrigin(
        'https://evil.example',
        'personal',
        ''
      )
    ).toBe(false)
  })

  it('matches the drive web origin for business drives', () => {
    expect(
      isAllowedPickerMessageOrigin(
        'https://contoso-my.sharepoint.com',
        'business',
        'https://contoso-my.sharepoint.com/personal/user/Documents'
      )
    ).toBe(true)
    expect(
      isAllowedPickerMessageOrigin(
        'https://other-my.sharepoint.com',
        'business',
        'https://contoso-my.sharepoint.com/personal/user/Documents'
      )
    ).toBe(false)
  })
})
