/**
 * OneDrive data-source plugin for cad-simple-viewer.
 *
 * @packageDocumentation
 */

export {
  ACAP_ONEDRIVE_DATA_SOURCE_ID,
  AcApOneDriveDataSource
} from './AcApOneDriveDataSource.js'
export type { AcApOneDrivePluginOptions } from './AcApOneDrivePlugin.js'
export { AcApOneDrivePlugin } from './AcApOneDrivePlugin.js'
export { createOneDrivePlugin } from './createOneDrivePlugin.js'
export type {
  DriveFile,
  OneDriveClientOptions,
  OneDrivePickerAuthCommand,
  UserInfo
} from './oneDriveClient.js'
export {
  isAllowedMicrosoftResourceUrl,
  isAllowedPickerMessageOrigin,
  OneDriveClient,
  resolveDefaultRedirectUri,
  resolveOneDrivePickerScopes
} from './oneDriveClient.js'
export { ONEDRIVE_PLUGIN_NAME } from './register.js'
