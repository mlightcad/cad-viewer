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
  registerMTextColorPicker
} from './register'

export const initializeCadViewer = (options: AcApDocManagerOptions = {}) => {
  AcApDocManager.createInstance(options)
  registerCmds()
  registerDialogs()
  registerMTextColorPicker()
}
