import {
  AcApContext,
  AcApDocManager,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import {
  ACAP_ONEDRIVE_DATA_SOURCE_ID,
  AcApOneDriveDataSource
} from './AcApOneDriveDataSource'
import type { OneDriveClientOptions } from './oneDriveClient'

/** Options for {@link AcApOneDrivePlugin}. */
export type AcApOneDrivePluginOptions = OneDriveClientOptions

/**
 * OneDrive data-source plugin for cad-simple-viewer.
 *
 * Registers an {@link AcApOneDriveDataSource} on load so Open menus can list
 * Sign in / Open from OneDrive / Sign out.
 */
export class AcApOneDrivePlugin implements AcApPlugin {
  /** @inheritdoc */
  name = 'OneDrivePlugin'
  /** @inheritdoc */
  version = packageJson.version
  /** @inheritdoc */
  description = 'Open DWG/DXF files from Microsoft OneDrive'

  private readonly options: AcApOneDrivePluginOptions
  private source: AcApOneDriveDataSource | null = null
  private createdSource = false

  constructor(options: AcApOneDrivePluginOptions) {
    this.options = options
  }

  onLoad(_context: AcApContext, _commandManager: AcEdCommandStack): void {
    const dsm = AcApDocManager.instance.dataSourceManager
    const existing = dsm.get(ACAP_ONEDRIVE_DATA_SOURCE_ID)
    if (existing) {
      this.source =
        existing instanceof AcApOneDriveDataSource ? existing : null
      void existing.restoreSession?.().catch(() => undefined)
      return
    }
    this.source = new AcApOneDriveDataSource(this.options, dsm)
    this.createdSource = true
    dsm.register(this.source)
    // Restore cached MSAL session so File → Open shows Open/Sign out, not Sign in.
    void this.source.restoreSession().catch(() => undefined)
  }

  onUnload(_context: AcApContext, _commandManager: AcEdCommandStack): void {
    if (this.createdSource) {
      AcApDocManager.instance.dataSourceManager.unregister(
        ACAP_ONEDRIVE_DATA_SOURCE_ID
      )
    }
    this.source = null
    this.createdSource = false
  }
}
