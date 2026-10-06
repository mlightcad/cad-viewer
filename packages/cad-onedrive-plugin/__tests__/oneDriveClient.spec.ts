import {
  isAllowedMicrosoftResourceUrl,
  isAllowedPickerMessageOrigin,
  resolveDefaultRedirectUri,
  resolveOneDrivePickerScopes
} from '../src/oneDriveClient'

describe('resolveDefaultRedirectUri', () => {
  it('keeps origin plus path for GitHub Pages subpath deployments', () => {
    expect(
      resolveDefaultRedirectUri('https://mlightcad.com/cad-viewer/cad-viewer/')
    ).toBe('https://mlightcad.com/cad-viewer/cad-viewer/')
  })

  it('adds a trailing slash for directory-like paths', () => {
    expect(
      resolveDefaultRedirectUri('https://mlightcad.com/cad-viewer/cad-viewer')
    ).toBe('https://mlightcad.com/cad-viewer/cad-viewer/')
  })

  it('strips query, hash, and index.html', () => {
    expect(
      resolveDefaultRedirectUri(
        'https://mlightcad.com/cad-viewer/cad-viewer/index.html?foo=1#bar'
      )
    ).toBe('https://mlightcad.com/cad-viewer/cad-viewer/')
  })

  it('uses origin with slash for the site root', () => {
    expect(resolveDefaultRedirectUri('https://mlightcad.com/')).toBe(
      'https://mlightcad.com/'
    )
    expect(resolveDefaultRedirectUri('http://localhost:5173/')).toBe(
      'http://localhost:5173/'
    )
  })
})

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
