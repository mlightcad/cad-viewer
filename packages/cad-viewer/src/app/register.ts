import {
  AcApDocManager,
  AcEdCommandStack,
  AcEdMTextEditor
} from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApDrawingUnitsCmd,
  AcApLayerStateCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd,
  AcApPropertiesCmd,
  AcApQSelectCmd,
  hatchRibbonCommand
} from '../command'
import {
  createMlColorIndexPickerToolbarFactory,
  MlDrawingUnitsDlg,
  MlPointStyleDlg,
  MlQuickSelectDlg,
  MlReplacementDlg
} from '../component'
import { useDialogManager } from '../composable'

let isCommandRegistered = false
export const registerCmds = () => {
  if (!isCommandRegistered) {
    const register = AcApDocManager.instance.commandManager
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'layer',
      'layer',
      new AcApLayerStateCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'hatch',
      'hatch',
      hatchRibbonCommand
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
      'qselect',
      'qselect',
      new AcApQSelectCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'units',
      'units',
      new AcApDrawingUnitsCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'properties',
      'properties',
      new AcApPropertiesCmd()
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
    registerDialog({
      name: 'QuickSelectDlg',
      component: markRaw(MlQuickSelectDlg),
      props: {}
    })
    registerDialog({
      name: 'DrawingUnitsDlg',
      component: markRaw(MlDrawingUnitsDlg),
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

let isLazyPluginRegistered = false

/**
 * Registers lazy plugins that load on first use of their trigger commands.
 *
 * Currently registers the PDF plugin (`cpdf`, `ipdf`), which is fetched only
 * when one of those commands runs. Safe to call multiple times; registration
 * runs once per application lifetime.
 */
export const registerLazyPlugins = () => {
  if (isLazyPluginRegistered) {
    return
  }

  AcApDocManager.instance.pluginManager.registerLazyPlugin({
    name: 'PdfPlugin',
    triggers: ['cpdf', 'ipdf'],
    loader: async () => {
      const { createPdfPlugin } = await import('@mlightcad/cad-pdf-plugin')
      return createPdfPlugin()
    }
  })

  isLazyPluginRegistered = true
}
