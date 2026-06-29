/**
 * Public entry point for {@link SIMPLE_UI_PLUGIN_NAME}.
 *
 * Re-exports the plugin factory, registration helper, configuration types,
 * i18n utilities, and layer store re-exports.
 */
export {
  AcApSimpleUiPlugin,
  createSimpleUiPlugin
} from './createSimpleUiPlugin'
export type { AcExDockPanelTab } from './ui/AcExDockPanel'
export { registerSimpleUiPlugin } from './register'
export {
  createToolbarLayoutSwitcher,
  prependToolbarLayoutSwitcher
} from './config/createToolbarLayoutSwitcher'
export type {
  AcExToolbarLayoutPreset,
  AcExToolbarLayoutSwitcherOptions
} from './config/createToolbarLayoutSwitcher'
export type {
  AcExDefaultToolbarContext,
  AcExDockPanelSide,
  AcExLocale,
  AcExSimpleUiPluginOptions,
  AcExToolbarItem,
  AcExToolbarItemConfig,
  AcExToolbarItemsInput,
  AcExToolbarChildIconMode,
  AcExToolbarPresetRef,
  AcExToolbarSeparator,
  AcExToolbarPlacement
} from './config/types'
export { SIMPLE_UI_PLUGIN_NAME } from './config/types'
export { createDefaultToolbarPresetMap } from './config/resolveToolbarItems'
export {
  createToolbarSeparator,
  toolbarPreset
} from './config/toolbarItemUtils'
export { AcExI18n, registerSimpleUiI18n } from './i18n'
export type { AcApLayerInfo } from '@mlightcad/cad-simple-viewer'
export { AcApLayerStore } from '@mlightcad/cad-simple-viewer'
