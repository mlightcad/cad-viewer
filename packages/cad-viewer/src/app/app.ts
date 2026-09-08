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
}

export const initializeCadViewer = (
  options: InitializeCadViewerOptions = {}
) => {
  const { htmlViewerRuntimeUrl, ...docOptions } = options
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
}
