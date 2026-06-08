import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'
import {
  AcApDocManager,
  AcEdCommandStack,
  AcEdMTextEditor
} from '@mlightcad/cad-simple-viewer'
import { registerLazySvgPlugin } from '@mlightcad/cad-svg-plugin/register'
import { markRaw } from 'vue'

import {
  AcApDrawingUnitsCmd,
  AcApLayerStateCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd,
  AcApPropertiesCmd,
  AcApQSelectCmd,
  AcApTextStyleCmd,
  hatchRibbonCommand
} from '../command'
import {
  createMlColorIndexPickerToolbarFactory,
  MlDrawingUnitsDlg,
  MlPointStyleDlg,
  MlQuickSelectDlg,
  MlReplacementDlg,
  MlTextStyleDlg
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
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'style',
      'style',
      new AcApTextStyleCmd(),
      'st'
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
    registerDialog({
      name: 'TextStyleDlg',
      component: markRaw(MlTextStyleDlg),
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
 * Currently registers the PDF plugin (`cpdf`, `ipdf`), the HTML export
 * plugin (`chtml`), and the SVG export plugin (`csvg`), which are fetched
 * only when one of those commands runs.
 * Safe to call multiple times; registration runs once per application lifetime.
 */
export const registerLazyPlugins = () => {
  if (isLazyPluginRegistered) {
    return
  }

  const pluginManager = AcApDocManager.instance.pluginManager
  registerLazyPdfPlugin(pluginManager)
  registerLazyHtmlPlugin(pluginManager)
  registerLazySvgPlugin(pluginManager)
  isLazyPluginRegistered = true
}
