/**
 * OneDrive data-source plugin for cad-simple-viewer.
 *
 * @packageDocumentation
 */

export {
  ACAP_ONEDRIVE_DATA_SOURCE_ID,
  AcApOneDriveDataSource
} from './AcApOneDriveDataSource'
export type { AcApOneDrivePluginOptions } from './AcApOneDrivePlugin'
export { AcApOneDrivePlugin } from './AcApOneDrivePlugin'
export { createOneDrivePlugin } from './createOneDrivePlugin'
export type {
  DriveFile,
  OneDriveClientOptions,
  OneDrivePickerAuthCommand,
  UserInfo
} from './oneDriveClient'
export {
  isAllowedMicrosoftResourceUrl,
  isAllowedPickerMessageOrigin,
  OneDriveClient,
  resolveOneDrivePickerScopes
} from './oneDriveClient'
export { ONEDRIVE_PLUGIN_NAME } from './register'
