/**
 * Reads Google Drive settings from Vite env (`VITE_GOOGLE_*`).
 */
export function getGoogleDriveEnvConfig(): {
  clientId: string
  apiKey: string
  appId: string
} | null {
  const clientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  )?.trim()
  const apiKey = (
    import.meta.env.VITE_GOOGLE_API_KEY as string | undefined
  )?.trim()
  const appId = (
    import.meta.env.VITE_GOOGLE_APP_ID as string | undefined
  )?.trim()
  if (
    !clientId ||
    !apiKey ||
    !appId ||
    clientId.includes('your_google_client_id_here') ||
    clientId.includes('your_client_id_here') ||
    apiKey.includes('your_google_api_key_here') ||
    apiKey.includes('your_api_key_here') ||
    appId.includes('your_google_app_id_here') ||
    appId.includes('your_app_id_here')
  ) {
    return null
  }
  return { clientId, apiKey, appId }
}

/**
 * Registers `@mlightcad/cad-google-drive-plugin` when `VITE_GOOGLE_*` are set.
 *
 * @returns `true` when the plugin was registered
 */
export async function registerGoogleDriveFromEnv(
  pluginManager: import('@mlightcad/cad-simple-viewer').AcApPluginManager
): Promise<boolean> {
  const config = getGoogleDriveEnvConfig()
  if (!config) return false
  const { registerGoogleDrivePlugin } = await import(
    '@mlightcad/cad-google-drive-plugin/register'
  )
  await registerGoogleDrivePlugin(pluginManager, config)
  return true
}
