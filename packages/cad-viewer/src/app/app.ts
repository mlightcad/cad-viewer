import 'element-plus/dist/index.css'
import '../style/style.css'
import '../style/index.scss'

import {
  AcApDocManager,
  AcApDocManagerOptions,
  createUiComponents,
  registerWorkers
} from '@mlightcad/cad-simple-viewer'

import { registerCmds } from './register'

export const initializeCadViewer = (options: AcApDocManagerOptions = {}) => {
  AcApDocManager.createInstance(options)
  registerWorkers()
  registerCmds()
  createUiComponents()
  AcApDocManager.instance.loadDefaultFonts()
}
