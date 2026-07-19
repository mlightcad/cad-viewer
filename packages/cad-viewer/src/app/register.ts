import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import { registerLazyPdfPlugin } from '@mlightcad/cad-pdf-plugin/register'
import {
  AcApDocManager,
  type AcApPluginManager,
  AcEdCommandStack,
  AcEdMTextEditor
} from '@mlightcad/cad-simple-viewer'
import { registerLazySvgPlugin } from '@mlightcad/cad-svg-plugin/register'
import { markRaw } from 'vue'

import {
  AcApAttEditCmd,
  AcApCountListCmd,
  AcApDrawingUnitsCmd,
  AcApExportHtmlDlgCmd,
  AcApInsertPaletteCmd,
  AcApLayerStateCmd,
  AcApMemCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd,
  AcApPropertiesCmd,
  AcApQSelectCmd,
  AcApTextStyleCmd,
  AcApXrefCmd,
  hatchRibbonCommand
} from '../command'
import {
  createMlColorIndexPickerToolbarFactory,
  MlAttEditDlg,
  MlDrawingUnitsDlg,
  MlExportHtmlDlg,
  MlPointStyleDlg,
  MlQuickSelectDlg,
  MlTextStyleDlg
} from '../component'
import { useDialogManager } from '../composable'
import { i18n } from '../locale'
import { store } from './store'

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
      'xref',
      'xref',
      new AcApXrefCmd()
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
      'chtml',
      'chtml',
      new AcApExportHtmlDlgCmd()
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
      'insert',
      'insert',
      new AcApInsertPaletteCmd(),
      'blockspalette'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'countlist',
      'countlist',
      new AcApCountListCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'mem',
      'mem',
      new AcApMemCmd(),
      'memstat'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'style',
      'style',
      new AcApTextStyleCmd(),
      'st'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'attedit',
      'attedit',
      new AcApAttEditCmd(),
      ['eattedit', 'ate']
    )
    isCommandRegistered = true
  }
}

let isDialogRegistered = false
export const registerDialogs = () => {
  if (!isDialogRegistered) {
    const { registerDialog } = useDialogManager()
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
      name: 'ExportHtmlDlg',
      component: markRaw(MlExportHtmlDlg),
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
    registerDialog({
      name: 'AttEditDlg',
      component: markRaw(MlAttEditDlg),
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
let isAgentIntegrationStarted = false

const registerAgentIntegration = async (pluginManager: AcApPluginManager) => {
  try {
    await import('@mlightcad/cad-agent-plugin/style.css')
    const agentRegister = await import('@mlightcad/cad-agent-plugin/register')

    agentRegister.setAgentPaletteOpener(() => {
      if (
        store.dialogs.layerManager &&
        store.dialogs.activePaletteTab === 'agent'
      ) {
        store.dialogs.layerManager = false
        return
      }

      store.dialogs.activePaletteTab = 'agent'
      store.dialogs.layerManager = true
    })

    agentRegister.mergeAgentI18nIntoVueI18n((locale, messages) => {
      i18n.global.mergeLocaleMessage(locale, messages)
    })

    agentRegister.registerLazyAgentPlugin(pluginManager)
    store.features.agentPlugin = true
  } catch {
    // Optional peer `@mlightcad/cad-agent-plugin` is not installed.
  }
}

/**
 * Registers lazy plugins that load on first use of their trigger commands.
 *
 * Currently registers the PDF plugin (`cpdf`, `ipdf`), the HTML export
 * plugin (`-chtml`), the SVG export plugin (`csvg`), and optionally the CAD
 * Agent plugin (`agent`) when `@mlightcad/cad-agent-plugin` is installed.
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

  if (!isAgentIntegrationStarted) {
    isAgentIntegrationStarted = true
    void registerAgentIntegration(pluginManager)
  }

  isLazyPluginRegistered = true
}
