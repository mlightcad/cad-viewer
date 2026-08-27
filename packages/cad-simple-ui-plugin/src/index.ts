/**
 * Public entry point for {@link SIMPLE_UI_PLUGIN_NAME}.
 *
 * Re-exports the plugin factory, registration helper, configuration types,
 * i18n utilities, and layer store re-exports.
 */
export {
  AcApSimpleUiPlugin,
  acuiCreateSimpleUiPlugin
} from './createSimpleUiPlugin'
export type { AcUiDockPanelTab } from './ui/AcUiDockPanel'
export { acuiRegisterSimpleUiPlugin } from './register'
export {
  acuiCreateToolbarLayoutSwitcher,
  acuiPrependToolbarLayoutSwitcher
} from './config/createToolbarLayoutSwitcher'
export type {
  AcUiToolbarLayoutPreset,
  AcUiToolbarLayoutSwitcherOptions
} from './config/createToolbarLayoutSwitcher'
export type {
  AcUiDefaultToolbarContext,
  AcUiDockPanelSide,
  AcUiLocale,
  AcUiSimpleUiPluginOptions,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarItemsInput,
  AcUiToolbarChildIconMode,
  AcUiToolbarChildrenUi,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator,
  AcUiToolbarPlacement
} from './config/types'
export { SIMPLE_UI_PLUGIN_NAME } from './config/types'
export { acuiCreateDefaultToolbarPresetMap } from './config/resolveToolbarItems'
export {
  acuiCreateToolbarSeparator,
  acuiToolbarPreset
} from './config/toolbarItemUtils'
export { AcUiI18n, acuiRegisterSimpleUiI18n } from './i18n'
export type { AcApLayerInfo } from '@mlightcad/cad-simple-viewer'
export { AcApLayerStore } from '@mlightcad/cad-simple-viewer'
