/**
 * Reads OneDrive / MSAL settings from Vite env (`VITE_MSAL_*`).
 */
export function getOneDriveEnvConfig(): {
  clientId: string
  tenantId: string
  redirectUri?: string
} | null {
  const clientId = (import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined)?.trim()
  if (
    !clientId ||
    clientId.includes('your_msal_client_id_here') ||
    clientId.includes('your_client_id_here')
  ) {
    return null
  }
  const tenantId =
    (import.meta.env.VITE_MSAL_TENANT_ID as string | undefined)?.trim() ||
    'common'
  const redirectUri = (
    import.meta.env.VITE_MSAL_REDIRECT_URI as string | undefined
  )?.trim()
  return {
    clientId,
    tenantId,
    ...(redirectUri ? { redirectUri } : {})
  }
}

/**
 * Registers `@mlightcad/cad-onedrive-plugin` when `VITE_MSAL_CLIENT_ID` is set.
 *
 * @returns `true` when the plugin was registered
 */
export async function registerOneDriveFromEnv(
  pluginManager: import('@mlightcad/cad-simple-viewer').AcApPluginManager
): Promise<boolean> {
  const config = getOneDriveEnvConfig()
  if (!config) return false
  const { registerOneDrivePlugin } = await import(
    '@mlightcad/cad-onedrive-plugin/register'
  )
  await registerOneDrivePlugin(pluginManager, config)
  return true
}
