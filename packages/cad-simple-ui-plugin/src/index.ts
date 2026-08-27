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
  AcUiToolbarConfig,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarItemsInput,
  AcUiToolbarChildIconMode,
  AcUiToolbarChildrenUi,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement,
  AcUiLayoutKind,
  AcUiLayoutOptions
} from './config/types'
export { SIMPLE_UI_PLUGIN_NAME } from './config/types'
export {
  AcUiToolbar,
  type AcUiToolbarDocBridge,
  type AcUiToolbarDocState,
  type AcUiToolbarI18n,
  type AcUiToolbarOptions
} from './ui/AcUiToolbar'
export { acuiEnsureUiStyles, acuiRemoveUiStylesIfUnused } from './ui/styles'
export {
  acuiCreateDefaultToolbarPresetMap,
  acuiGetBuiltInToolbarDefaults,
  acuiMergeToolbarConfigs,
  acuiResolveLayoutToolbarConfig,
  acuiResolveToolbarItems
} from './config/resolveToolbarItems'
export {
  acuiCreateToolbarSeparator,
  acuiExpandToolbarItemConfigs,
  acuiToolbarPreset
} from './config/toolbarItemUtils'
export {
  acuiCreateSettingsToolbarItem,
  acuiCreateZoomToolbarItem,
  MOBILE_DEFAULT_TOOLBAR_ITEMS
} from './config/defaultToolbarItems'
export { AcUiI18n, acuiRegisterSimpleUiI18n } from './i18n'
export type { AcApLayerInfo } from '@mlightcad/cad-simple-viewer'
export { AcApLayerStore } from '@mlightcad/cad-simple-viewer'
