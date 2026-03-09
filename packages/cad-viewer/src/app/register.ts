import { AcApDocManager, AcEdCommandStack } from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApLayerStateCmd,
  AcApMeasureAngleCmd,
  AcApMeasureAreaCmd,
  AcApMeasureClearCmd,
  AcApMeasureDistCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd
} from '../command'
import { MlPointStyleDlg, MlReplacementDlg } from '../component'
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
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'measureDist',
      'measureDist',
      new AcApMeasureDistCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'measureArea',
      'measureArea',
      new AcApMeasureAreaCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'measureAngle',
      'measureAngle',
      new AcApMeasureAngleCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'measureClear',
      'measureClear',
      new AcApMeasureClearCmd()
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
