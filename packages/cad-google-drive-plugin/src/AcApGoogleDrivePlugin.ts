import {
  AcApContext,
  AcApDocManager,
  AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import {
  ACAP_GOOGLE_DRIVE_DATA_SOURCE_ID,
  AcApGoogleDriveDataSource
} from './AcApGoogleDriveDataSource'
import type { GoogleDriveClientOptions } from './googleDriveClient'

/** Options for {@link AcApGoogleDrivePlugin}. */
export type AcApGoogleDrivePluginOptions = GoogleDriveClientOptions

/**
 * Google Drive data-source plugin for cad-simple-viewer.
 *
 * Registers an {@link AcApGoogleDriveDataSource} on load so Open menus can list
 * Sign in / Open from Google Drive / Sign out.
 */
export class AcApGoogleDrivePlugin implements AcApPlugin {
  /** @inheritdoc */
  name = 'GoogleDrivePlugin'
  /** @inheritdoc */
  version = packageJson.version
  /** @inheritdoc */
  description = 'Open DWG/DXF files from Google Drive'

  private readonly options: AcApGoogleDrivePluginOptions
  private source: AcApGoogleDriveDataSource | null = null
  private createdSource = false

  constructor(options: AcApGoogleDrivePluginOptions) {
    this.options = options
  }

  onLoad(_context: AcApContext, _commandManager: AcEdCommandStack): void {
    const dsm = AcApDocManager.instance.dataSourceManager
    const existing = dsm.get(ACAP_GOOGLE_DRIVE_DATA_SOURCE_ID)
    if (existing) {
      this.source =
        existing instanceof AcApGoogleDriveDataSource ? existing : null
      void existing.restoreSession?.().catch(() => undefined)
      return
    }
    this.source = new AcApGoogleDriveDataSource(this.options, dsm)
    this.createdSource = true
    dsm.register(this.source)
    void this.source.restoreSession().catch(() => undefined)
  }

  onUnload(_context: AcApContext, _commandManager: AcEdCommandStack): void {
    if (this.createdSource) {
      AcApDocManager.instance.dataSourceManager.unregister(
        ACAP_GOOGLE_DRIVE_DATA_SOURCE_ID
      )
    }
    this.source = null
    this.createdSource = false
  }
}
