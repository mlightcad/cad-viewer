/**
 * Google Drive data-source plugin for cad-simple-viewer.
 *
 * @packageDocumentation
 */

export {
  ACAP_GOOGLE_DRIVE_DATA_SOURCE_ID,
  AcApGoogleDriveDataSource
} from './AcApGoogleDriveDataSource.js'
export type { AcApGoogleDrivePluginOptions } from './AcApGoogleDrivePlugin.js'
export { AcApGoogleDrivePlugin } from './AcApGoogleDrivePlugin.js'
export { createGoogleDrivePlugin } from './createGoogleDrivePlugin.js'
export type {
  DriveAppAction,
  DriveFile,
  GoogleDriveClientOptions,
  UserInfo
} from './googleDriveClient.js'
export {
  GoogleDriveClient,
  isGoogleDriveConfigured,
  isGoogleDrivePickerConfigured
} from './googleDriveClient.js'
export { GOOGLE_DRIVE_PLUGIN_NAME } from './register.js'
