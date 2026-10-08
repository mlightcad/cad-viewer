import {
  AcApGoogleDrivePlugin,
  type AcApGoogleDrivePluginOptions
} from './AcApGoogleDrivePlugin'

/**
 * Creates a Google Drive plugin instance.
 *
 * @param options - Google OAuth / Picker configuration
 */
export async function createGoogleDrivePlugin(
  options: AcApGoogleDrivePluginOptions
): Promise<AcApGoogleDrivePlugin> {
  return new AcApGoogleDrivePlugin(options)
}
