import 'element-plus/dist/index.css'
import '../style/style.css'
import '../style/index.scss'

import {
  AcApDocManager,
  AcApDocManagerOptions
} from '@mlightcad/cad-simple-viewer'

import {
  registerAnnotationUiPlugin,
  registerCmds,
  registerDialogs,
  registerLazyPlugins,
  registerMTextColorPicker
} from './register'

export const initializeCadViewer = async (
  options: AcApDocManagerOptions = {}
) => {
  AcApDocManager.createInstance(options)
  registerCmds()
  registerDialogs()
  registerMTextColorPicker()
  registerLazyPlugins()
  await registerAnnotationUiPlugin()
}