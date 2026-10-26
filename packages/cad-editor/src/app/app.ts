import 'element-plus/dist/index.css'
import '../style/style.css'
import '../style/index.scss'

import {
  AcApDocManager,
  AcApDocManagerOptions
} from '@mlightcad/cad-simple-viewer'

import { registerCadViewerNotificationCenter } from './cadViewerNotificationCenter'
import {
  registerCmds,
  registerDialogs,
  registerLazyPlugins,
  type RegisterLazyPluginsOptions,
  registerMTextColorPicker
} from './register'

/** Options for {@link initializeCadViewer}. */
export type InitializeCadViewerOptions = AcApDocManagerOptions & {
  /**
   * URL of `viewer-runtime.iife.js` for HTML export (`chtml`).
   * Forwarded to `@mlightcad/cad-html-plugin` — not required to open DXF/DWG.
   * @default './assets/viewer-runtime.iife.js'
   */
  htmlViewerRuntimeUrl?: string | URL
  /**
   * When set, loads `@mlightcad/cad-onedrive-plugin` if installed and registers
   * the OneDrive data source for Open menus.
   */
  onedrive?: {
    clientId: string
    tenantId?: string
    redirectUri?: string
  }
  /**
   * When set, loads `@mlightcad/cad-google-drive-plugin` if installed and
   * registers the Google Drive data source for Open menus.
   */
  googledrive?: {
    clientId: string
    apiKey: string
    /** Numeric Google Cloud project number (Picker `setAppId`). */
    appId: string
  }
}

export const initializeCadViewer = (
  options: InitializeCadViewerOptions = {}
) => {
  const { htmlViewerRuntimeUrl, onedrive, googledrive, ...docOptions } =
    options
  AcApDocManager.createInstance({
    ...docOptions,
    // Keep the shared event bridge; Vue panel replaces the built-in DOM UI.
    notificationCenter: {
      showDefaultUi: false,
      host: docOptions.busyIndicatorHost ?? docOptions.container
    }
  })
  registerCadViewerNotificationCenter()
  registerCmds()
  registerDialogs()
  registerMTextColorPicker()

  const lazyPluginOptions: RegisterLazyPluginsOptions = {
    htmlPlugin: {
      viewerRuntimeUrl:
        htmlViewerRuntimeUrl ?? './assets/viewer-runtime.iife.js'
    }
  }
  registerLazyPlugins(lazyPluginOptions)

  if (onedrive?.clientId) {
    void import('@mlightcad/cad-onedrive-plugin/register')
      .then(({ registerOneDrivePlugin }) =>
        registerOneDrivePlugin(AcApDocManager.instance.pluginManager, onedrive)
      )
      .catch(() => {
        // Optional peer `@mlightcad/cad-onedrive-plugin` is not installed.
      })
  }

  if (googledrive?.clientId && googledrive.apiKey && googledrive.appId) {
    void import('@mlightcad/cad-google-drive-plugin/register')
      .then(({ registerGoogleDrivePlugin }) =>
        registerGoogleDrivePlugin(
          AcApDocManager.instance.pluginManager,
          googledrive
        )
      )
      .catch(() => {
        // Optional peer `@mlightcad/cad-google-drive-plugin` is not installed.
      })
  }
}
