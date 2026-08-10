import 'element-plus/dist/index.css'
import '../style/style.css'
import '../style/index.scss'

import {
  AcApDocManager,
  AcApDocManagerOptions
} from '@mlightcad/cad-simple-viewer'

import {
  registerCmds,
  registerDialogs,
  registerLazyPlugins,
  type RegisterLazyPluginsOptions,
  registerMTextColorPicker} from './register'

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
  AcApDocManager.createInstance(docOptions)
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
