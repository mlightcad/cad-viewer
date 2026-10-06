import {
  type AcApDataSource,
  type AcApDataSourceAccountProfile,
  type AcApDataSourceAuthState,
  type AcApDataSourceFile,
  type AcApDataSourceManager,
  AcApDocManager,
  acapOpenCenteredPopup,
  acapWithDataSourceBusy
} from '@mlightcad/cad-simple-viewer'

import {
  OneDriveClient,
  type OneDriveClientOptions
} from './oneDriveClient'

/** Built-in OneDrive data source id. */
export const ACAP_ONEDRIVE_DATA_SOURCE_ID = 'onedrive'

/**
 * Data source that opens DWG/DXF files from Microsoft OneDrive / SharePoint.
 *
 * Implements the {@link AcApDataSource} host contract: UI layers only call
 * `signIn` / `pick` / `restoreSession` — all File Picker and download logic
 * stays inside this class.
 */
export class AcApOneDriveDataSource implements AcApDataSource {
  readonly id = ACAP_ONEDRIVE_DATA_SOURCE_ID
  readonly labelKey = 'main.dataSource.onedrive'
  readonly requiresAuth = true
  readonly requiresUserGesture = true

  private readonly client: OneDriveClient
  private readonly dataSourceManager: AcApDataSourceManager
  private initPromise: Promise<void> | null = null

  constructor(
    options: OneDriveClientOptions,
    dataSourceManager: AcApDataSourceManager
  ) {
    this.client = new OneDriveClient(options)
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
   * Loads MSAL cache / redirect result so Open menus show signed-in state
   * without requiring another interactive login.
   */
  async restoreSession(): Promise<void> {
    await this.ensureInit()
    this.notifyAuthChanged()
  }

  async signIn(): Promise<void> {
    await this.ensureInit()
    if (this.client.isAuthenticated) {
      this.notifyAuthChanged()
      return
    }
    await this.client.authenticate()
    this.notifyAuthChanged()
  }

  async signOut(): Promise<void> {
    await this.client.signOut()
    this.notifyAuthChanged()
  }

  async pick(): Promise<AcApDataSourceFile | null> {
    // Open the popup in this click tick. Any `await` first loses the gesture.
    const popup = acapOpenCenteredPopup('OneDrivePicker', 1080, 680)
    if (!popup) {
      throw new Error('Popup blocked. Allow popups for this site and try again.')
    }
    try {
      popup.document.title = 'OneDrive'
      popup.document.body.textContent = 'Opening OneDrive…'
    } catch {
      // Cross-origin after navigation — ignore
    }

    try {
      await this.ensureInit()
      if (!this.client.isAuthenticated) {
        throw new Error(
          'Sign in to OneDrive first, then choose a file (popup blocker).'
        )
      }
      const driveFile = await this.client.openFilePicker(popup)
      const content = await acapWithDataSourceBusy(() =>
        this.client.getFileContent(driveFile)
      )
      return { name: driveFile.name, content }
    } catch (error) {
      try {
        if (!popup.closed) popup.close()
      } catch {
        // ignore
      }
      if (
        error instanceof Error &&
        (error.message === 'Picker cancelled' ||
          error.message === 'No file selected')
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
