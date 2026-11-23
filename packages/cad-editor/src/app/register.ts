import type { AcApHtmlPluginOptions } from '@mlightcad/cad-html-plugin/register'
import {
  AcApDocManager,
  AcApPaletteService,
  type AcApPluginManager,
  AcEdCommandStack,
  AcEdMTextEditor
} from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApAttDefCmd,
  AcApAttEditCmd,
  AcApBDetectCmd,
  AcApBSearchCmd,
  AcApClassicGroupCmd,
  AcApCountListCmd,
  AcApDimStyleCmd,
  AcApDrawingUnitsCmd,
  AcApFindCmd,
  AcApInsertPaletteCmd,
  AcApLayerStateCmd,
  AcApMarkupPanelCmd,
  AcApMeasurementPanelCmd,
  AcApMemCmd,
  AcApMissedDataCmd,
  AcApMLeaderStyleCmd,
  AcApNewViewCmd,
  AcApOpenPerfCmd,
  AcApPointStyleCmd,
  AcApPropertiesCmd,
  AcApQSelectCmd,
  AcApTextStyleCmd,
  AcApUcsManCmd,
  AcApViewCmd,
  AcApXrefCmd,
  hatchRibbonCommand
} from '../command'
import {
  createMlColorIndexPickerToolbarFactory,
  MlAttDefDlg,
  MlAttEditDlg,
  MlBConvertDlg,
  MlClassicGroupDlg,
  MlDimStyleDlg,
  MlDrawingUnitsDlg,
  MlMLeaderStyleDlg,
  MlNewViewDlg,
  MlPointStyleDlg,
  MlQuickSelectDlg,
  MlTextStyleDlg,
  MlUcsManagerDlg,
  MlViewManagerDlg
} from '../component'
import { useDialogManager } from '../composable'
import { mlPaletteHost } from './paletteHost'
import { ensurePluginUiBridge } from './pluginUi'

let isCommandRegistered = false
export const registerCmds = () => {
  if (!isCommandRegistered) {
    const register = AcApDocManager.instance.commandManager
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'layer',
      'layer',
      new AcApLayerStateCmd(),
      AcApDocManager.instance.getResolvedCommandAliases('layer')
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'hatch',
      'hatch',
      hatchRibbonCommand,
      AcApDocManager.instance.getResolvedCommandAliases('hatch')
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
      new AcApXrefCmd(),
      AcApDocManager.instance.getResolvedCommandAliases('xref')
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
      new AcApDrawingUnitsCmd(),
      AcApDocManager.instance.getResolvedCommandAliases('units')
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'properties',
      'properties',
      new AcApPropertiesCmd(),
      AcApDocManager.instance.getResolvedCommandAliases('properties')
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
      'find',
      'find',
      new AcApFindCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'countlist',
      'countlist',
      new AcApCountListCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'markuppanel',
      'markuppanel',
      new AcApMarkupPanelCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'measurementpanel',
      'measurementpanel',
      new AcApMeasurementPanelCmd()
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
      'openperf',
      'openperf',
      new AcApOpenPerfCmd(),
      ['openprofile', 'openprofui']
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'style',
      'style',
      new AcApTextStyleCmd(),
      'st'
    )
    // DIMSTYLE is also registered as a sysvar command. Replace it so the
    // name opens the Dimension Style Manager instead of a value prompt.
    register.removeCmd(AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME, 'dimstyle')
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'dimstyle',
      'dimstyle',
      new AcApDimStyleCmd(),
      'ddim'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'mleaderstyle',
      'mleaderstyle',
      new AcApMLeaderStyleCmd(),
      'mls'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'view',
      'view',
      new AcApViewCmd(),
      'ddview'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'newview',
      'newview',
      new AcApNewViewCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'ucsman',
      'ucsman',
      new AcApUcsManCmd(),
      'dducs'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'classicgroup',
      'classicgroup',
      new AcApClassicGroupCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'attedit',
      'attedit',
      new AcApAttEditCmd(),
      ['eattedit', 'ate']
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'attdef',
      'attdef',
      new AcApAttDefCmd(),
      'ddattdef'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'bsearch',
      'bsearch',
      new AcApBSearchCmd(),
      'bconvert'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'bdetect',
      'bdetect',
      new AcApBDetectCmd()
    )
    isCommandRegistered = true
  }
}

let isDialogRegistered = false
export const registerDialogs = () => {
  if (!isDialogRegistered) {
    const { registerDialog } = useDialogManager()
    AcApPaletteService.setHost(mlPaletteHost)
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
    registerDialog({
      name: 'DimStyleDlg',
      component: markRaw(MlDimStyleDlg),
      props: {}
    })
    registerDialog({
      name: 'MLeaderStyleDlg',
      component: markRaw(MlMLeaderStyleDlg),
      props: {}
    })
    registerDialog({
      name: 'AttEditDlg',
      component: markRaw(MlAttEditDlg),
      props: {}
    })
    registerDialog({
      name: 'AttDefDlg',
      component: markRaw(MlAttDefDlg),
      props: {}
    })
    registerDialog({
      name: 'BConvertDlg',
      component: markRaw(MlBConvertDlg),
      props: {}
    })
    registerDialog({
      name: 'ViewManagerDlg',
      component: markRaw(MlViewManagerDlg),
      props: {}
    })
    registerDialog({
      name: 'NewViewDlg',
      component: markRaw(MlNewViewDlg),
      props: {}
    })
    registerDialog({
      name: 'UcsManagerDlg',
      component: markRaw(MlUcsManagerDlg),
      props: {}
    })
    registerDialog({
      name: 'ClassicGroupDlg',
      component: markRaw(MlClassicGroupDlg),
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
let isPaddleOcrIntegrationStarted = false
let isLlmIntegrationStarted = false
let isAgentIntegrationStarted = false
let isScriptIntegrationStarted = false

/**
 * Registers the local PaddleOCR text recognizer when the optional
 * `@mlightcad/cad-paddleocr-plugin` peer is installed. Must run before the
 * LLM recognizer so unread lines fall back to the vision model.
 */
const registerPaddleOcrIntegration = async (
  pluginManager: AcApPluginManager
) => {
  try {
    const paddleRegister =
      await import('@mlightcad/cad-paddleocr-plugin/register')
    paddleRegister.registerLazyPaddleOcrPlugin(pluginManager, {
      wasmPaths: './vendor/onnxruntime/'
    })
  } catch {
    // Optional peer `@mlightcad/cad-paddleocr-plugin` is not installed.
  }
}

/**
 * Registers the shared AI model settings (`llmsettings`, LLM text
 * recognition for `pdftext`) when the optional `@mlightcad/cad-llm-plugin`
 * peer is installed. The CAD Agent reads its model from these settings.
 */
const registerLlmIntegration = async (pluginManager: AcApPluginManager) => {
  try {
    const llmRegister = await import('@mlightcad/cad-llm-plugin/register')
    llmRegister.registerLazyLlmPlugin(pluginManager)
  } catch {
    // Optional peer `@mlightcad/cad-llm-plugin` is not installed.
  }
}

const registerAgentIntegration = async (pluginManager: AcApPluginManager) => {
  try {
    await import('@mlightcad/cad-agent-plugin/style.css')
    const agentRegister = await import('@mlightcad/cad-agent-plugin/register')
    agentRegister.registerLazyAgentPlugin(pluginManager)
  } catch {
    // Optional peer `@mlightcad/cad-agent-plugin` is not installed.
  }
}

const registerCadScriptIntegration = async (
  pluginManager: AcApPluginManager
) => {
  try {
    await import('@mlightcad/cad-script-plugin/style.css')
    const scriptRegister = await import('@mlightcad/cad-script-plugin/register')
    scriptRegister.registerLazyCadScriptPlugin(pluginManager)
  } catch {
    // Optional peer `@mlightcad/cad-script-plugin` is not installed.
  }
}

/**
 * Loads the PDF plugin. Ribbon, export menu, and the `cpdf` dialog command
 * are registered by the plugin. A missing package hides all of them.
 */
const registerPdfIntegration = async (
  pluginManager: AcApPluginManager,
  disableExport: boolean
) => {
  try {
    const pdfRegister = await import('@mlightcad/cad-pdf-plugin/register')
    pdfRegister.registerLazyPdfPlugin(pluginManager, { disableExport })
  } catch {
    // Optional peer `@mlightcad/cad-pdf-plugin` is not installed.
  }
}

/** Loads the HTML export plugin. The plugin owns the `chtml` dialog command. */
const registerHtmlIntegration = async (
  pluginManager: AcApPluginManager,
  htmlPlugin?: AcApHtmlPluginOptions
) => {
  try {
    const htmlRegister = await import('@mlightcad/cad-html-plugin/register')
    htmlRegister.registerLazyHtmlPlugin(pluginManager, htmlPlugin)
  } catch {
    // Optional peer `@mlightcad/cad-html-plugin` is not installed.
  }
}

/** Loads the SVG export plugin. The plugin owns the `csvg` command. */
const registerSvgIntegration = async (pluginManager: AcApPluginManager) => {
  try {
    const svgRegister = await import('@mlightcad/cad-svg-plugin/register')
    svgRegister.registerLazySvgPlugin(pluginManager)
  } catch {
    // Optional peer `@mlightcad/cad-svg-plugin` is not installed.
  }
}

/**
 * Options for {@link registerLazyPlugins}.
 */
export interface RegisterLazyPluginsOptions {
  /** Options passed to {@link registerLazyHtmlPlugin} (HTML export only). */
  htmlPlugin?: AcApHtmlPluginOptions
}

/**
 * Registers lazy plugins that load on first use of their trigger commands.
 *
 * Currently registers the PDF plugin (`-cpdf`, `pdfimport`), the HTML export
 * plugin (`-chtml`), the SVG export plugin (`csvg`), and optionally local
 * PaddleOCR text recognition when `@mlightcad/cad-paddleocr-plugin` is
 * installed, the AI model settings (`llmsettings`) when
 * `@mlightcad/cad-llm-plugin` is installed, the CAD Agent plugin (`agent`)
 * when `@mlightcad/cad-agent-plugin` is installed, and the script console
 * (`cadscript`) when `@mlightcad/cad-script-plugin` is installed.
 * When {@link AcApDocManager.disableExport} is true, HTML/SVG export plugins
 * are skipped and the PDF plugin only exposes `pdfimport`. Host dialog
 * commands `chtml` / `cpdf` are registered only after the matching plugin
 * import succeeds.
 * Safe to call multiple times; registration runs once per application lifetime.
 *
 * @param options - Optional HTML plugin settings such as `viewerRuntimeUrl`
 */
export const registerLazyPlugins = (
  options: RegisterLazyPluginsOptions = {}
) => {
  if (isLazyPluginRegistered) {
    return
  }

  ensurePluginUiBridge()
  const pluginManager = AcApDocManager.instance.pluginManager
  const disableExport = AcApDocManager.instance.disableExport
  void registerPdfIntegration(pluginManager, disableExport)
  if (!disableExport) {
    void registerHtmlIntegration(pluginManager, options.htmlPlugin)
    void registerSvgIntegration(pluginManager)
  }

  if (!isPaddleOcrIntegrationStarted) {
    isPaddleOcrIntegrationStarted = true
    // Await Paddle before LLM so registration order is paddleocr → cad-llm.
    // Both stay async (optional peers), but OCR pickers listen to
    // AcApTextRecognitionService.events.changed so the UI catches up.
    void (async () => {
      await registerPaddleOcrIntegration(pluginManager)
      if (!isLlmIntegrationStarted) {
        isLlmIntegrationStarted = true
        await registerLlmIntegration(pluginManager)
      }
    })()
  } else if (!isLlmIntegrationStarted) {
    isLlmIntegrationStarted = true
    void registerLlmIntegration(pluginManager)
  }
  if (!isAgentIntegrationStarted) {
    isAgentIntegrationStarted = true
    void registerAgentIntegration(pluginManager)
  }
  if (!isScriptIntegrationStarted) {
    isScriptIntegrationStarted = true
    void registerCadScriptIntegration(pluginManager)
  }

  isLazyPluginRegistered = true
}
