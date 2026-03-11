import {
  AcApDocManager,
  AcEdCommandStack,
  AcEdMTextEditor
} from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApLayerStateCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd
} from '../command'
import {
  createMlColorIndexPickerToolbarFactory,
  MlPointStyleDlg,
  MlReplacementDlg
} from '../component'
import { useDialogManager } from '../composable'

let isCommandRegistered = false
export const registerCmds = () => {
  if (!isCommandRegistered) {
    const register = AcApDocManager.instance.commandManager
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'la',
      'la',
      new AcApLayerStateCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'md',
      'md',
      new AcApMissedDataCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'pttype',
      'pttype',
      new AcApPointStyleCmd()
    )
    isCommandRegistered = true
  }
}

let isDialogRegistered = false
export const registerDialogs = () => {
  if (!isDialogRegistered) {
    const { registerDialog } = useDialogManager()
    registerDialog({
      name: 'ReplacementDlg',
      component: markRaw(MlReplacementDlg),
      props: {}
    })
    registerDialog({
      name: 'PointStyleDlg',
      component: markRaw(MlPointStyleDlg),
      props: {}
    })
    isDialogRegistered = true
  }
}

let isMTextColorPickerRegistered = false
export const registerMTextColorPicker = () => {
  if (!isMTextColorPickerRegistered) {
    AcEdMTextEditor.setDefaultColorPicker(
      createMlColorIndexPickerToolbarFactory()
    )
    isMTextColorPickerRegistered = true
  }
}
