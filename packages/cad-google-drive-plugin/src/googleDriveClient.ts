export interface UserInfo {
  name: string
  email: string
  picture: string
}

export interface DriveFile {
  id: string
  name: string
  size: string
  modifiedTime: string
  mimeType: string
}

export interface DriveAppAction {
  action: string
  fileId: string
  fileName: string
  mimeType: string
}

/** Options for constructing {@link GoogleDriveClient}. */
export interface GoogleDriveClientOptions {
  /** OAuth 2.0 Web client ID from Google Cloud Console. */
  clientId: string
  /** API key used for gapi client init and Google Picker. */
  apiKey: string
  /**
   * Numeric Google Cloud **project number** (not the project id string).
   * Required for Google Picker (`PickerBuilder.setAppId`).
   */
  appId: string
}

// drive.file: only files the user opens with this app (Picker / Drive "Open with").
// Prefer this over drive.readonly (restricted) for public OAuth verification.
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

const CAD_EXTENSIONS = ['.dwg', '.dxf']

const isPlaceholder = (value: string) =>
  !value ||
  value.includes('your_client_id_here') ||
  value.includes('your_api_key_here') ||
  value.includes('your_google_client_id_here') ||
  value.includes('your_google_api_key_here') ||
  value.includes('your_google_app_id_here') ||
  value.includes('your_app_id_here')

/**
 * Whether OAuth + Drive download credentials look configured.
 * Does not require Picker `appId`.
 */
export function isGoogleDriveConfigured(
  options: Pick<GoogleDriveClientOptions, 'clientId' | 'apiKey'>
): boolean {
  return !isPlaceholder(options.clientId) && !isPlaceholder(options.apiKey)
}

/**
 * Whether Google Picker credentials look configured (includes numeric app id).
 */
export function isGoogleDrivePickerConfigured(
  options: GoogleDriveClientOptions
): boolean {
  return isGoogleDriveConfigured(options) && !isPlaceholder(options.appId)
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${src}"]`
  )
  if (existing) {
    return existing.dataset.loaded === 'true'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () =>
            reject(new Error(`Failed to load ${src}`))
          )
        })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function toDriveFile(file: {
  id?: string | null
  name?: string | null
  size?: string | null
  modifiedTime?: string | null
  mimeType?: string | null
}): DriveFile | null {
  if (!file.id || !file.name || !file.modifiedTime || !file.mimeType) {
    return null
  }
  return {
    id: file.id,
    name: file.name,
    size: file.size || '0',
    modifiedTime: file.modifiedTime,
    mimeType: file.mimeType
  }
}

function isCadFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return CAD_EXTENSIONS.some(ext => lower.endsWith(ext))
}

type TokenCallback = (response: google.accounts.oauth2.TokenResponse) => void

/**
 * Client-side Google Drive helper: GIS OAuth, Drive metadata/download, and
 * Google Picker. Google APIs are loaded from CDN at runtime (no npm SDK).
 */
const GAPI_LOAD_TIMEOUT_MS = 30_000

export class GoogleDriveClient {
  private readonly options: GoogleDriveClientOptions
  private tokenClient: google.accounts.oauth2.TokenClient | null = null
  private gapiReady = false
  private gisReady = false
  private pickerReady = false
  private accessToken = ''
  private initPromise: Promise<void> | null = null
  private pendingAuth: {
    resolve: () => void
    reject: (error: Error) => void
  } | null = null
  private pendingPicker: {
    resolve: (file: DriveFile) => void
    reject: (error: Error) => void
  } | null = null

  isAuthenticated = false
  userInfo: UserInfo = { name: '', email: '', picture: '' }

  constructor(options: GoogleDriveClientOptions) {
    this.options = options
  }

  async initialize(): Promise<void> {
    if (this.gapiReady && this.gisReady && this.pickerReady) return
    if (!this.initPromise) {
      this.initPromise = this.doInitialize().catch(error => {
        this.initPromise = null
        throw error
      })
    }
    return this.initPromise
  }

  private async doInitialize(): Promise<void> {
    if (!isGoogleDriveConfigured(this.options)) {
      throw new Error(
        'Google Drive credentials not configured. Pass clientId and apiKey to registerGoogleDrivePlugin.'
      )
    }

    await Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client')
    ])

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error('Timed out loading Google Picker API'))
      }, GAPI_LOAD_TIMEOUT_MS)
      gapi.load('client:picker', () => {
        window.clearTimeout(timer)
        resolve()
      })
    })

    await gapi.client.init({
      apiKey: this.options.apiKey,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
      ]
    })

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.options.clientId,
      scope: SCOPES,
      callback: response => this.handleTokenResponse(response)
    })

    this.gapiReady = true
    this.gisReady = true
    this.pickerReady = true
  }

  private handleTokenResponse: TokenCallback = response => {
    if (response.error || !response.access_token) {
      const error = new Error(
        response.error || 'Google Drive authorization failed'
      )
      this.pendingAuth?.reject(error)
      this.pendingAuth = null
      return
    }

    this.accessToken = response.access_token
    gapi.client.setToken({ access_token: response.access_token })
    this.isAuthenticated = true

    const pending = this.pendingAuth
    this.pendingAuth = null

    // Wait for profile before resolving authenticate(), so signIn →
    // notifyAuthChanged sees name / avatar (same pattern as OneDrive).
    void this.loadUserProfile(response.access_token)
      .catch((error: unknown) => {
        console.warn('Could not load Google user profile:', error)
      })
      .then(() => {
        pending?.resolve()
      })
  }

  private async loadUserProfile(accessToken: string): Promise<void> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to load user profile (${response.status})`)
    }

    const profile = (await response.json()) as {
      name?: string
      email?: string
      picture?: string
    }
    this.userInfo = {
      name: profile.name || profile.email || '',
      email: profile.email || '',
      picture: profile.picture || ''
    }
  }

  authenticate(): Promise<void> {
    if (!isGoogleDriveConfigured(this.options)) {
      return Promise.reject(
        new Error(
          'Google Drive credentials not configured. Pass clientId and apiKey to registerGoogleDrivePlugin.'
        )
      )
    }

    return new Promise((resolve, reject) => {
      void this.initialize()
        .then(() => {
          if (!this.tokenClient) {
            reject(new Error('Token client not initialized'))
            return
          }
          // Overlapping Sign in clicks must not orphan the previous Promise.
          this.pendingAuth?.reject(
            new Error('Google Drive sign-in superseded by a newer request')
          )
          this.pendingAuth = { resolve, reject }
          // Empty prompt reuses prior grant when possible; avoids forcing
          // consent every fresh session (GIS still shows account UI as needed).
          this.tokenClient.requestAccessToken({ prompt: '' })
        })
        .catch(reject)
    })
  }

  signOut(): void {
    if (this.gapiReady) {
      const token = gapi.client.getToken()
      if (token?.access_token) {
        google.accounts.oauth2.revoke(token.access_token, () => {})
        gapi.client.setToken(null)
      }
    }

    this.pendingAuth?.reject(new Error('Signed out'))
    this.pendingAuth = null
    this.pendingPicker?.reject(new Error('Signed out'))
    this.pendingPicker = null
    this.accessToken = ''
    this.isAuthenticated = false
    this.userInfo = { name: '', email: '', picture: '' }
  }

  async getFileDetails(fileId: string): Promise<DriveFile> {
    const response = await gapi.client.drive.files.get({
      fileId,
      fields: 'id,name,size,modifiedTime,mimeType',
      supportsAllDrives: true
    })
    const file = toDriveFile(response.result)
    if (!file) {
      throw new Error('Incomplete Drive file metadata')
    }
    return file
  }

  async getFileContent(fileId: string): Promise<ArrayBuffer> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated')
    }

    const token = this.accessToken || gapi.client.getToken()?.access_token
    if (!token) {
      throw new Error('No access token')
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to download Drive file (${response.status})`)
    }

    return response.arrayBuffer()
  }

  /**
   * Opens Google's official Drive file picker and resolves with the chosen CAD file.
   *
   * Google Picker is an in-page overlay (not `window.open`), so it does not need
   * a pre-opened blank popup. Callers should still keep Sign in and Open as
   * separate clicks so the GIS token popup is not blocked.
   */
  openFilePicker(): Promise<DriveFile> {
    return new Promise((resolve, reject) => {
      if (!isGoogleDrivePickerConfigured(this.options)) {
        reject(
          new Error(
            'Google Picker requires appId (numeric Cloud project number). Pass it to registerGoogleDrivePlugin.'
          )
        )
        return
      }

      void this.initialize()
        .then(() => {
          if (!this.isAuthenticated) {
            throw new Error(
              'Sign in to Google Drive first, then open the file picker.'
            )
          }

          const token = this.accessToken || gapi.client.getToken()?.access_token
          if (!token) {
            reject(new Error('No access token for Google Picker'))
            return
          }

          this.pendingPicker?.reject(
            new Error('Google Drive picker superseded by a newer request')
          )
          this.pendingPicker = { resolve, reject }

          const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
          view.setIncludeFolders(true)
          view.setSelectFolderEnabled(false)
          view.setMode(google.picker.DocsViewMode.LIST)
          // Prefer CAD names; mime types for DWG/DXF vary, so still validate below.
          view.setQuery('.dwg OR .dxf')

          const settle = (
            action: 'resolve' | 'reject',
            value: DriveFile | Error
          ) => {
            const pending = this.pendingPicker
            this.pendingPicker = null
            if (!pending) return
            if (action === 'resolve') {
              pending.resolve(value as DriveFile)
            } else {
              pending.reject(value as Error)
            }
          }

          const picker = new google.picker.PickerBuilder()
            .addView(view)
            .addView(google.picker.ViewId.RECENTLY_PICKED)
            .setOAuthToken(token)
            .setDeveloperKey(this.options.apiKey)
            .setAppId(this.options.appId)
            .setTitle('Select a CAD file (DWG / DXF)')
            .setCallback((data: google.picker.ResponseObject) => {
              if (data.action === google.picker.Action.CANCEL) {
                settle('reject', new Error('Picker cancelled'))
                return
              }
              if (data.action !== google.picker.Action.PICKED) return

              const doc = data.docs?.[0]
              if (!doc?.id || !doc.name) {
                settle('reject', new Error('No file selected'))
                return
              }
              if (!isCadFileName(doc.name)) {
                settle(
                  'reject',
                  new Error('Please select a .dwg or .dxf file')
                )
                return
              }

              settle('resolve', {
                id: doc.id,
                name: doc.name,
                size: String(doc.sizeBytes ?? 0),
                modifiedTime: doc.lastEditedUtc
                  ? new Date(doc.lastEditedUtc).toISOString()
                  : new Date().toISOString(),
                mimeType: doc.mimeType || 'application/octet-stream'
              })
            })
            .build()

          picker.setVisible(true)
        })
        .catch(error => {
          if (this.pendingPicker?.resolve === resolve) {
            this.pendingPicker = null
          }
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  }

  /**
   * Parses Drive App “Open with” query params
   * (`?action=open&fileId=…&fileName=…&mimeType=…`).
   */
  parseDriveAppActionFromUrl(
    search = typeof window !== 'undefined' ? window.location.search : ''
  ): DriveAppAction | null {
    const params = new URLSearchParams(search)
    const action = params.get('action')
    const fileId = params.get('fileId')
    const fileName = params.get('fileName')
    const mimeType = params.get('mimeType')

    if (!action || !fileId || !fileName || !mimeType) return null
    return { action, fileId, fileName, mimeType }
  }
}
