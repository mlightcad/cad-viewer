/**
 * Public entry point for {@link SIMPLE_UI_PLUGIN_NAME}.
 *
 * Re-exports the plugin factory, registration helper, configuration types,
 * responsive layout helpers ({@link acuiMergeToolbarOptionsForLayout},
 * phone toolbar builders), i18n utilities, and layer store re-exports.
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
  AcUiLayoutOptions,
  AcUiLocale,
  AcUiPluginLayoutMode,
  AcUiSimpleUiPluginOptions,
  AcUiSubToolbarOptions,
  AcUiSubToolbarPosition,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarItemsInput,
  AcUiToolbarOptions,
  AcUiToolbarChromeOptions,
  AcUiToolbarChildIconMode,
  AcUiToolbarChildrenUi,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator,
  AcUiToolbarOverflow,
  AcUiToolbarSize,
  AcUiToolbarPlacement
} from './config/types'
export { SIMPLE_UI_PLUGIN_NAME } from './config/types'
export {
  acuiCreateDefaultToolbarPresetMap,
  acuiResolveToolbarItems
} from './config/resolveToolbarItems'
export {
  acuiCreateDefaultToolbarItems,
  acuiCreatePhoneToolbarItems,
  acuiCreateSettingsToolbarItem,
  acuiCreateZoomToolbarItem
} from './config/defaultToolbarItems'
export { acuiMergeToolbarOptionsForLayout } from './config/mergeToolbarOptionsForLayout'
export { acuiResolveToolbarChrome } from './config/resolveToolbarChrome'
export type { AcUiResolvedToolbarChrome } from './config/resolveToolbarChrome'
export {
  acuiCreateToolbarSeparator,
  acuiToolbarPreset
} from './config/toolbarItemUtils'
export { AcUiI18n, acuiRegisterSimpleUiI18n } from './i18n'
export type { AcUiToolbarMountOptions } from './ui/AcUiToolbar'
export type { AcApLayerInfo } from '@mlightcad/cad-simple-viewer'
export { AcApLayerStore } from '@mlightcad/cad-simple-viewer'
