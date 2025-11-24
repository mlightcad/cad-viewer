import { AcEdCommandStack } from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApLayerStateCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd
} from '../command'
import { MlPointStyleDlg, MlReplacementDlg } from '../component'
import { useDialogManager } from '../composable'

export const registerCmds = () => {
  AcEdCommandStack.instance.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'la',
    'la',
    new AcApLayerStateCmd()
  )
  AcEdCommandStack.instance.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'md',
    'md',
    new AcApMissedDataCmd()
  )
  AcEdCommandStack.instance.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'pttype',
    'pttype',
    new AcApPointStyleCmd()
  )
}

export const registerDialogs = () => {
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
}
