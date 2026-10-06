import {
  AcApOneDrivePlugin,
  type AcApOneDrivePluginOptions
} from './AcApOneDrivePlugin'

/**
 * Creates an OneDrive plugin instance.
 *
 * @param options - Azure SPA client configuration
 */
export async function createOneDrivePlugin(
  options: AcApOneDrivePluginOptions
): Promise<AcApOneDrivePlugin> {
  return new AcApOneDrivePlugin(options)
}
