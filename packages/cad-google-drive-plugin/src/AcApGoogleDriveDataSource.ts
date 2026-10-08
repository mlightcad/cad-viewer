import {
  type AcApDataSource,
  type AcApDataSourceAccountProfile,
  type AcApDataSourceAuthState,
  type AcApDataSourceFile,
  type AcApDataSourceManager,
  AcApDocManager,
  acapWithDataSourceBusy
} from '@mlightcad/cad-simple-viewer'

import {
  GoogleDriveClient,
  type GoogleDriveClientOptions
} from './googleDriveClient'

/** Built-in Google Drive data source id. */
export const ACAP_GOOGLE_DRIVE_DATA_SOURCE_ID = 'googledrive'

/**
 * Data source that opens DWG/DXF files from Google Drive.
 *
 * Implements the {@link AcApDataSource} host contract: UI layers only call
 * `signIn` / `pick` / `restoreSession` — all Picker and download logic stays
 * inside this class.
 */
export class AcApGoogleDriveDataSource implements AcApDataSource {
  readonly id = ACAP_GOOGLE_DRIVE_DATA_SOURCE_ID
  readonly labelKey = 'main.dataSource.googledrive'
  readonly requiresAuth = true
  /** GIS token popup and Picker should run from a direct user gesture. */
  readonly requiresUserGesture = true

  private readonly client: GoogleDriveClient
  private readonly dataSourceManager: AcApDataSourceManager
  private initPromise: Promise<void> | null = null

  constructor(
    options: GoogleDriveClientOptions,
    dataSourceManager: AcApDataSourceManager
  ) {
    this.client = new GoogleDriveClient(options)
    this.dataSourceManager = dataSourceManager
  }

  private ensureInit(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.client.initialize().catch(error => {
        this.initPromise = null
        throw error
      })
    }
    return this.initPromise
  }

  getAuthState(): AcApDataSourceAuthState {
    return this.client.isAuthenticated ? 'signed-in' : 'signed-out'
  }

  getAccountLabel(): string | undefined {
    const info = this.client.userInfo
    return info.email || info.name || undefined
  }

  getAccountProfile(): AcApDataSourceAccountProfile | undefined {
    if (!this.client.isAuthenticated) return undefined
    const info = this.client.userInfo
    const displayName = info.name || info.email
    if (!displayName) return undefined
    return {
      displayName,
      ...(info.email ? { email: info.email } : {}),
      ...(info.picture ? { avatarUrl: info.picture } : {})
    }
  }

  /**
   * Preloads GIS / gapi / Picker so Sign in can open the token popup from a
   * user gesture. Tokens are not persisted across reloads (GIS in-memory
   * token), so auth stays signed-out until the user signs in again.
   */
  async restoreSession(): Promise<void> {
    await this.ensureInit()
    this.notifyAuthChanged()
  }

  async signIn(): Promise<void> {
    // Prefer a completed preload from restoreSession; still await ensureInit
    // if the user clicks before scripts finished loading.
    await this.ensureInit()
    if (this.client.isAuthenticated) {
      this.notifyAuthChanged()
      return
    }
    await this.client.authenticate()
    this.notifyAuthChanged()
  }

  async signOut(): Promise<void> {
    this.client.signOut()
    this.notifyAuthChanged()
  }

  async pick(): Promise<AcApDataSourceFile | null> {
    try {
      await this.ensureInit()
      if (!this.client.isAuthenticated) {
        throw new Error(
          'Sign in to Google Drive first, then choose a file (popup blocker).'
        )
      }
      const driveFile = await this.client.openFilePicker()
      const content = await acapWithDataSourceBusy(() =>
        this.client.getFileContent(driveFile.id)
      )
      return { name: driveFile.name, content }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Picker cancelled' ||
          error.message === 'No file selected' ||
          error.message === 'Please select a .dwg or .dxf file')
      ) {
        return null
      }
      throw error
    }
  }

  private notifyAuthChanged(): void {
    this.dataSourceManager.notifyAuthChanged(this.id)
    const docManager = AcApDocManager.tryGetInstance()
    const docDsm = docManager?.dataSourceManager
    if (docDsm && docDsm !== this.dataSourceManager && docDsm.get(this.id)) {
      docDsm.notifyAuthChanged(this.id)
    }
  }
}
